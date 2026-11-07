// Adapted from https://dsc106.com/labs/lab06/.
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
import { renderPlot } from './plot.js';

function parseLine(row) {
  return {
    ...row,
    line: Number(row.line),
    depth: Number(row.depth),
    length: Number(row.length),
    dateISO: row.date,
    date: new Date(row.date + 'T00:00' + row.timezone),
    datetime: new Date(row.datetime),
  };
}

function processCommits(data) {
  return d3.groups(data, (row) => row.commit).map(([id, lines]) => {
    const { author, date, dateISO, time, timezone, datetime } = lines[0];
    const [hour, minute, second] = time.split(':').map(Number);
    const commit = {
      id,
      url: 'https://github.com/aozbas/portfolio/commit/' + id,
      author,
      date,
      dateISO,
      datetime,
      time,
      timezone,
      hourFrac: hour + minute / 60 + second / 3600,
      totalLines: lines.length,
    };
    Object.defineProperty(commit, 'lines', { value: lines, enumerable: false });
    return commit;
  });
}

function dayPeriod(hour) {
  if (hour < 6) return 'Night';
  if (hour < 12) return 'Morning';
  if (hour < 18) return 'Afternoon';
  if (hour < 22) return 'Evening';
  return 'Night';
}

function renderCommitInfo(data, commits) {
  const fileLengths = d3.rollups(data, (rows) => d3.max(rows, (row) => row.line), (row) => row.file);
  const [longestFile, maxLines] = d3.greatest(fileLengths, ([, length]) => length);
  const linesByPeriod = d3.rollups(commits,
    (group) => d3.sum(group, (commit) => commit.totalLines),
    (commit) => dayPeriod(commit.hourFrac),
  );
  const busiestCount = d3.max(linesByPeriod, ([, count]) => count);
  const busiestPeriods = linesByPeriod.filter(([, count]) => count === busiestCount);
  const countFormat = d3.format(',d');
  const summary = [
    ['Total lines of code', countFormat(data.length)],
    ['Total commits', countFormat(commits.length)],
    ['Files analyzed', countFormat(fileLengths.length)],
    ['Longest file', `${longestFile} (${countFormat(maxLines)} lines)`],
    ['Average file length', `${d3.mean(fileLengths, ([, length]) => length).toFixed(1)} lines`],
    ['Most lines by time of day', busiestPeriods.map(([period]) => period).join(' / ')],
  ];

  const pairs = d3.select('#stats').append('dl').attr('class', 'stats')
    .selectAll('div').data(summary).join('div');
  pairs.append('dt').text(([label]) => label);
  pairs.append('dd').text(([, value]) => value);
}

const status = document.querySelector('#meta-status');
const analysis = document.querySelector('#meta-analysis');

try {
  const data = await d3.csv(new URL('./loc.csv', import.meta.url), parseLine);
  if (data.length === 0) {
    status.textContent = 'There are no lines of code in this snapshot.';
  } else {
    const commits = processCommits(data);
    analysis.hidden = false;
    renderCommitInfo(data, commits);
    renderPlot(commits);
    status.hidden = true;
  }
} catch (error) {
  analysis.hidden = true;
  status.textContent = 'The code analysis could not be loaded. Refresh the page to try again.';
  console.error('Could not display the code analysis.', error);
}
