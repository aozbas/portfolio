// Adapted from https://dsc106.com/labs/lab03/.
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
