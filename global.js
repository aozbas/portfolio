// Adapted from https://dsc106.com/labs/lab03/ and https://dsc106.com/labs/lab04/.
const pages = [
  { url: '', title: 'Home' },
  { url: 'projects/', title: 'Projects' },
  { url: 'contact/', title: 'Contact' },
  { url: 'resume/', title: 'Resume' },
  { url: 'https://github.com/aozbas', title: 'GitHub' },
];

const BASE_PATH =
  location.hostname === 'localhost' || location.hostname === '127.0.0.1'
    ? '/'
    : '/portfolio/';

const nav = document.createElement('nav');
nav.setAttribute('aria-label', 'Main navigation');
document.body.prepend(nav);

const currentPath = location.pathname.replace(/index\.html$/, '');

for (const page of pages) {
  const link = document.createElement('a');
  link.href = page.url.startsWith('http') ? page.url : BASE_PATH + page.url;
  link.textContent = page.title;

  if (link.host === location.host && link.pathname === currentPath) {
    link.classList.add('current');
    link.setAttribute('aria-current', 'page');
  }

  if (link.host !== location.host) {
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
  }

  nav.append(link);
}

document.body.insertAdjacentHTML(
  'afterbegin',
  `<label class="color-scheme">
    Theme:
    <select>
      <option value="light dark">Automatic</option>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
    </select>
  </label>`,
);

const select = document.querySelector('.color-scheme select');

function setColorScheme(colorScheme) {
  document.documentElement.style.setProperty('color-scheme', colorScheme);
  select.value = colorScheme;
}

try {
  const savedScheme = localStorage.getItem('colorScheme');
  if (['light dark', 'light', 'dark'].includes(savedScheme)) {
    setColorScheme(savedScheme);
  }
} catch (error) {
  console.warn('Could not load the saved theme.', error);
}

select.addEventListener('input', (event) => {
  const colorScheme = event.target.value;
  setColorScheme(colorScheme);

  try {
    localStorage.setItem('colorScheme', colorScheme);
  } catch (error) {
    console.warn('Could not save the theme.', error);
  }
});

export async function fetchJSON(url) {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching or parsing JSON data:', error);
    throw error;
  }
}

export async function fetchGitHubData(username) {
  return fetchJSON(`https://api.github.com/users/${encodeURIComponent(username)}`);
}

export function renderProjects(projects, containerElement, headingLevel = 'h2') {
  if (!/^h[1-6]$/.test(headingLevel)) {
    throw new Error('The heading level must be h1 through h6.');
  }

  containerElement.innerHTML = '';

  if (projects.length === 0) {
    containerElement.textContent = 'No projects to display yet.';
    return;
  }

  for (const project of projects) {
    const article = document.createElement('article');

    if (project.placeholder) {
      article.classList.add('project-placeholder');
    }

    article.innerHTML = `
      <${headingLevel}></${headingLevel}>
      <img alt="" width="640" height="400" />
      <div><p></p></div>
    `;

    const heading = article.querySelector(headingLevel);

    if (project.url) {
      const link = document.createElement('a');
      link.href = project.url;
      link.textContent = project.title;
      heading.append(link);
    } else {
      heading.textContent = project.title;
    }

    const image = article.querySelector('img');
    image.src = new URL(project.image, import.meta.url).href;
    image.alt = project.alt ?? '';

    if (project.placeholder) {
      image.loading = 'lazy';
    }

    const description = article.querySelector('p');
    description.textContent = project.description;

    if (project.tools) {
      const tools = document.createElement('p');
      tools.classList.add('project-tools');
      tools.textContent = project.tools;
      description.after(tools);
    }

    containerElement.append(article);
  }
}
