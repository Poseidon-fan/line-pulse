import { readFileSync } from 'node:fs';
import { strFromU8, unzipSync } from 'fflate';

function readArtifacts(version) {
  const project = JSON.parse(readFileSync('package.json', 'utf8'));
  if (project.version !== version) {
    throw new Error('The checked-out version does not match the release version.');
  }

  return ['chrome', 'firefox'].map((browser) => {
    const name = `${project.name}-${version}-${browser}.zip`;
    const data = readFileSync(`.output/${name}`);
    const entries = unzipSync(data, { filter: (entry) => entry.name === 'manifest.json' });
    if (!entries['manifest.json']) {
      throw new Error(`${name} does not contain manifest.json.`);
    }

    const manifest = JSON.parse(strFromU8(entries['manifest.json']));
    if (
      manifest.version !== version.split(/[+-]/)[0] ||
      (manifest.version_name ?? manifest.version) !== version
    ) {
      throw new Error(`${name} does not match version ${version}.`);
    }

    return { name, data };
  });
}

async function checkExistingTag(github, repository, tag, sha) {
  let reference;
  try {
    const response = await github.rest.git.getRef({ ...repository, ref: `tags/${tag}` });
    reference = response.data.object;
  } catch (error) {
    if (error.status === 404) return;
    throw error;
  }

  while (reference.type === 'tag') {
    const response = await github.rest.git.getTag({ ...repository, tag_sha: reference.sha });
    reference = response.data.object;
  }

  if (reference.type !== 'commit' || reference.sha !== sha) {
    throw new Error(`${tag} already points to another commit. Bump the version before releasing.`);
  }
}

export async function createDraftRelease({ github, context, core, version }) {
  const artifacts = readArtifacts(version);
  const repository = context.repo;
  const tag = `v${version}`;
  const releases = await github.paginate(github.rest.repos.listReleases, {
    ...repository,
    per_page: 100,
  });
  let release = releases.find((entry) => entry.tag_name === tag);
  if (release && !release.draft) {
    throw new Error(`${tag} is already published. Bump the version before releasing.`);
  }

  await checkExistingTag(github, repository, tag, context.sha);

  if (!release) {
    const response = await github.rest.repos.createRelease({
      ...repository,
      tag_name: tag,
      target_commitish: context.sha,
      name: tag,
      draft: true,
      prerelease: version.split('+')[0].includes('-'),
      generate_release_notes: true,
    });
    release = response.data;
  }

  const existingAssets = await github.paginate(github.rest.repos.listReleaseAssets, {
    ...repository,
    release_id: release.id,
    per_page: 100,
  });

  for (const artifact of artifacts) {
    const current = await github.rest.repos.getRelease({ ...repository, release_id: release.id });
    if (!current.data.draft) {
      throw new Error(`${tag} was published during this run. Its assets will not be updated.`);
    }

    const existing = existingAssets.find((asset) => asset.name === artifact.name);
    if (existing) {
      await github.rest.repos.deleteReleaseAsset({ ...repository, asset_id: existing.id });
    }
    await github.rest.repos.uploadReleaseAsset({
      ...repository,
      release_id: release.id,
      name: artifact.name,
      data: artifact.data,
      headers: {
        'content-type': 'application/zip',
        'content-length': artifact.data.length,
      },
    });
  }

  const current = await github.rest.repos.getRelease({ ...repository, release_id: release.id });
  if (!current.data.draft) {
    throw new Error(`${tag} was published during this run. Its target will not be updated.`);
  }
  await github.rest.repos.updateRelease({
    ...repository,
    release_id: release.id,
    target_commitish: context.sha,
  });

  core.info(`Draft ready for review: ${release.html_url}`);
  await core.summary
    .addHeading(`Draft ${tag}`)
    .addLink('Review and publish on GitHub', release.html_url)
    .addList(artifacts.map((artifact) => artifact.name))
    .write();
}
