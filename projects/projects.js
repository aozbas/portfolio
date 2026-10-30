// Adapted from https://dsc106.com/labs/lab05/.
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
import { fetchJSON, renderProjects } from '../global.js';

const projectsContainer = document.querySelector('.projects');
const projectsTitle = document.querySelector('.projects-title');
const searchInput = document.querySelector('.searchBar');
const clearYearButton = document.querySelector('.clear-year');
const results = document.querySelector('#project-results');
const svg = d3.select('#projects-pie-plot');
const legend = d3.select('.legend');
const chartEmpty = document.querySelector('.chart-empty');
const colors = d3.scaleOrdinal(d3.schemeTableau10);
const arcGenerator = d3.arc().innerRadius(0).outerRadius(50);
const sliceGenerator = d3.pie().sort(null).value((d) => d.value);

let projects = [];
let query = '';
let selectedYear = null;

function selectYear(year) {
  selectedYear = selectedYear === year ? null : year;
  updateResults(false);
}

function updateSelection() {
  svg.selectAll('path')
    .classed('selected', (d) => d.data.label === selectedYear)
    .attr('aria-pressed', (d) => String(d.data.label === selectedYear));

  legend.selectAll('li')
    .classed('selected', (d) => d.label === selectedYear);
  legend.selectAll('button')
    .attr('aria-pressed', (d) => String(d.label === selectedYear));

  clearYearButton.disabled = selectedYear === null;
}

function renderPieChart(projectsGiven) {
  const data = d3.rollups(projectsGiven, (group) => group.length, (project) => project.year)
    .sort(([a], [b]) => a - b)
    .map(([year, count]) => ({ label: year, value: count }));

  svg.selectAll('path').remove();
  legend.selectAll('li').remove();
  svg.attr('hidden', data.length === 0 ? true : null);
  legend.attr('hidden', data.length === 0 ? true : null);
  chartEmpty.hidden = data.length !== 0;

  sliceGenerator(data).forEach((slice) => {
    const year = slice.data.label;
    const label = `${year}: ${slice.data.value} ${slice.data.value === 1 ? 'project' : 'projects'}`;

    const path = svg.append('path')
      .datum(slice)
      .attr('d', arcGenerator)
      .attr('fill', colors(year))
      .attr('role', 'button')
      .attr('tabindex', 0)
      .attr('aria-label', label)
      .on('click', () => selectYear(year))
      .on('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          selectYear(year);
        }
      });
    path.append('title').text(label);

    const item = legend.append('li')
      .datum(slice.data)
      .attr('style', `--color: ${colors(year)}`);
    const button = item.append('button')
      .attr('type', 'button')
      .attr('aria-label', label)
      .on('click', () => selectYear(year));
    button.append('span').attr('class', 'swatch').attr('aria-hidden', 'true');
    button.append('span').text(`${year} (${slice.data.value})`);
  });
}

function updateResults(redrawChart = true) {
  const searchMatches = projects.filter((project) =>
    Object.values(project).join('\n').toLowerCase().includes(query.toLowerCase()),
  );
  const visibleProjects = searchMatches.filter((project) =>
    selectedYear === null || project.year === selectedYear,
  );

  renderProjects(visibleProjects, projectsContainer);
  projectsTitle.textContent = `Projects (${visibleProjects.length})`;
  results.textContent = `Showing ${visibleProjects.length} of ${projects.length} projects${selectedYear === null ? '' : ` from ${selectedYear}`}${query ? ` matching “${query}”` : ''}.`;

  if (visibleProjects.length === 0) {
    projectsContainer.textContent = 'No projects match these filters. Try another search or show all years.';
  }

  if (redrawChart) {
    renderPieChart(searchMatches);
  }
  updateSelection();
}

searchInput.addEventListener('input', (event) => {
  query = event.target.value;
  updateResults();
});

clearYearButton.addEventListener('click', () => {
  selectedYear = null;
  updateResults(false);
});

try {
  projects = await fetchJSON(new URL('../lib/projects.json', import.meta.url));
  colors.domain([...new Set(projects.map((project) => project.year))].sort());
  searchInput.disabled = false;
  updateResults();
} catch (error) {
  results.textContent = 'Projects could not be loaded. Please refresh to try again.';
  projectsContainer.textContent = '';
}
