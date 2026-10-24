import { fetchJSON, renderProjects, fetchGitHubData } from './global.js';

const projectsContainer = document.querySelector('.projects');

async function loadLatestProjects() {
  try {
    const projects = await fetchJSON(new URL('./lib/projects.json', import.meta.url));
    const latestProjects = projects.slice(0, 3);
    renderProjects(latestProjects, projectsContainer, 'h3');
  } catch (error) {
    projectsContainer.textContent = 'Projects could not be loaded. Please refresh to try again.';
  }
}

async function loadGitHubStats() {
  const profileStats = document.querySelector('#profile-stats');

  if (!profileStats) return;

  try {
    const githubData = await fetchGitHubData('aozbas');

    profileStats.innerHTML = `
      <dl>
        <div><dt>Public repositories</dt><dd>${githubData.public_repos.toLocaleString()}</dd></div>
        <div><dt>Public gists</dt><dd>${githubData.public_gists.toLocaleString()}</dd></div>
        <div><dt>Followers</dt><dd>${githubData.followers.toLocaleString()}</dd></div>
        <div><dt>Following</dt><dd>${githubData.following.toLocaleString()}</dd></div>
      </dl>
    `;
  } catch (error) {
    profileStats.textContent = 'GitHub statistics are unavailable right now. Please try again later.';
  }
}

loadLatestProjects();
loadGitHubStats();
