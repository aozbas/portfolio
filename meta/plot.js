// Adapted from https://dsc106.com/labs/lab06/.
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

const dateLabel = d3.utcFormat('%B %-d, %Y');
const percent = d3.format('.1~%');
const languageNames = { js: 'JavaScript', css: 'CSS', html: 'HTML', json: 'JSON' };

// Put the recorded wall-clock dates on a single timeline in every viewer's timezone.
function chartDate(commit) {
  return new Date(`${commit.dateISO}T${commit.time}Z`);
}

function showSelection(selected) {
  const count = selected.length;
  const label = count === 1 ? '1 commit selected' : `${count || 'No'} commits selected`;
  d3.select('#selection-count').text(label);

  const lines = selected.flatMap((commit) => commit.lines);
  const breakdown = d3.rollups(lines, (group) => group.length, (line) => line.type)
    .sort((a, b) => d3.descending(a[1], b[1]) || d3.ascending(a[0], b[0]));
  const entries = d3.select('#language-breakdown').selectAll('div')
    .data(breakdown, ([type]) => type)
    .join((enter) => {
      const entry = enter.append('div');
      entry.append('dt');
      entry.append('dd');
      return entry;
    });
  entries.select('dt').text(([type]) => languageNames[type] ?? type);
  entries.select('dd').text(([, n]) =>
    `${n.toLocaleString()} ${n === 1 ? 'line' : 'lines'} (${percent(n / lines.length)})`);
}

export function renderPlot(commits) {
  const container = document.getElementById('chart');
  const tooltip = document.getElementById('commit-tooltip');
  const svg = d3.select(container).append('svg')
    .attr('role', 'group').attr('aria-label', 'Portfolio commits by date and local time');
  const grid = svg.append('g').attr('class', 'gridlines').attr('aria-hidden', 'true');
  const xAxis = svg.append('g').attr('class', 'x-axis');
  const yAxis = svg.append('g').attr('class', 'y-axis');
  const xTitle = svg.append('text').attr('class', 'axis-title').attr('text-anchor', 'middle')
    .text('Commit date');
  const brushLayer = svg.append('g').attr('class', 'brush');
  const dates = d3.extent(commits, chartDate);
  if (+dates[0] === +dates[1]) {
    dates[0] = d3.utcDay.offset(dates[0], -1);
    dates[1] = d3.utcDay.offset(dates[1], 1);
  }
  const x = d3.scaleUtc().domain(dates).nice();
  const y = d3.scaleLinear().domain([0, 24]);
  const radius = d3.scaleSqrt().domain([0, d3.max(commits, (d) => d.totalLines)]);
  const times = [0, 4, 8, 12, 16, 20, 24];

  let hideTimer;
  function hideSoon() {
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      if (!tooltip.matches(':hover, :focus-within')) tooltip.hidden = true;
    }, 180);
  }

  function positionTooltip(clientX, clientY) {
    const box = tooltip.getBoundingClientRect();
    const left = clientX + box.width + 12 <= window.innerWidth
      ? clientX + 8 : clientX - box.width - 8;
    const top = clientY + box.height + 12 <= window.innerHeight
      ? clientY + 8 : clientY - box.height - 8;
    tooltip.style.left = `${Math.max(4, left)}px`;
    tooltip.style.top = `${Math.max(4, top)}px`;
  }

  function showTooltip(event, commit) {
    clearTimeout(hideTimer);
    d3.select('#commit-link').attr('href', commit.url).text(commit.id);
    d3.select('#commit-date').text(dateLabel(chartDate(commit)));
    d3.select('#commit-time').text(`${commit.time} UTC${commit.timezone}`);
    d3.select('#commit-author').text(commit.author);
    d3.select('#commit-lines').text(commit.totalLines.toLocaleString());
    tooltip.hidden = false;
    if (event.type === 'focus') {
      const box = event.currentTarget.getBoundingClientRect();
      positionTooltip(box.right, box.top + box.height / 2);
    } else {
      positionTooltip(event.clientX, event.clientY);
    }
  }

  d3.select(tooltip).on('pointerenter focusin', () => clearTimeout(hideTimer))
    .on('pointerleave focusout', hideSoon);

  const links = svg.append('g').attr('class', 'dots').selectAll('a')
    .data(d3.sort(commits, (d) => -d.totalLines))
    .join('a')
    .attr('href', (d) => d.url).attr('target', '_blank').attr('rel', 'noopener noreferrer')
    .attr('aria-label', (d) =>
      `Commit ${d.id}, ${d.dateISO} at ${d.time}, ${d.author}, ${d.totalLines} ${d.totalLines === 1 ? 'line' : 'lines'}. View on GitHub.`)
    .on('pointerenter focus', showTooltip)
    .on('pointermove', (event) => positionTooltip(event.clientX, event.clientY))
    .on('pointerleave blur', hideSoon);
  // Enlarge small targets slightly while keeping nearby dots reachable.
  const targets = links.append('rect').attr('fill', 'transparent');
  const dots = links.append('circle');

  function updateBrush({ selection }) {
    d3.select('#clear-selection').property('disabled', !selection);
    const selected = selection ? commits.filter((d) => {
      const [[left, top], [right, bottom]] = selection;
      const cx = x(chartDate(d));
      const cy = y(d.hourFrac);
      return cx >= left && cx <= right && cy >= top && cy <= bottom;
    }) : [];
    const ids = new Set(selected.map((d) => d.id));
    dots.classed('selected', (d) => ids.has(d.id));
    showSelection(selected);
  }

  const brush = d3.brush().on('start', () => { tooltip.hidden = true; })
    .on('brush end', updateBrush);
  d3.select('#clear-selection').on('click', () => brushLayer.call(brush.move, null));
  links.on('keydown', (event, d) => {
    if (event.key === ' ') {
      event.preventDefault();
      const cx = x(chartDate(d));
      const cy = y(d.hourFrac);
      brushLayer.call(brush.move, [[cx - 1, cy - 1], [cx + 1, cy + 1]]);
    }
    if (event.key === 'Escape') brushLayer.call(brush.move, null);
  });

  let previousWidth = 0;
  function layout(width) {
    if (width === previousWidth || width < 1) return;
    previousWidth = width;
    const extent = d3.brushSelection(brushLayer.node());
    const selectedRange = extent?.map(([cx, cy]) => [x.invert(cx), y.invert(cy)]);
    const height = Math.max(260, Math.min(420, width * 0.5));
    const left = 44, right = width - 24, top = 26, bottom = height - 48;
    svg.attr('viewBox', `0 0 ${width} ${height}`);
    x.range([left, right]);
    y.range([bottom, top]);
    radius.range([0, width < 480 ? 16 : 22]);

    grid.attr('transform', `translate(${left},0)`)
      .call(d3.axisLeft(y).tickValues(times).tickSize(left - right).tickFormat(''));
    grid.selectAll('.tick').classed('day', (hour) => hour >= 6 && hour < 18)
      .classed('night', (hour) => hour < 6 || hour >= 18);
    xAxis.attr('transform', `translate(0,${bottom})`)
      .call(d3.axisBottom(x).ticks(Math.max(2, Math.floor(width / 90)))
        .tickFormat(d3.utcFormat('%b %-d')).tickSizeOuter(0));
    yAxis.attr('transform', `translate(${left},0)`)
      .call(d3.axisLeft(y).tickValues(times)
        .tickFormat((hour) => `${String(hour % 24).padStart(2, '0')}:00`).tickSizeOuter(0));
    xTitle.attr('x', (left + right) / 2).attr('y', height - 4);
    dots.attr('cx', (d) => x(chartDate(d))).attr('cy', (d) => y(d.hourFrac))
      .attr('r', (d) => radius(d.totalLines));
    const hitRadius = (d) => Math.min(8, radius(d.totalLines) + 2);
    targets.attr('x', (d) => x(chartDate(d)) - hitRadius(d))
      .attr('y', (d) => y(d.hourFrac) - hitRadius(d))
      .attr('width', (d) => 2 * hitRadius(d)).attr('height', (d) => 2 * hitRadius(d));
    brushLayer.call(brush.extent([[left, top], [right, bottom]]));
    if (selectedRange) brushLayer.call(brush.move, selectedRange.map(([date, hour]) => [x(date), y(hour)]));
  }

  layout(container.clientWidth);
  new ResizeObserver(() => layout(container.clientWidth)).observe(container);
}
