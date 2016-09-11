'use strict';

const getColumns = (filter, tableNumber) => {
  const head = [].filter.call(document.querySelectorAll('.mtext'), (v) => {
    return new RegExp(filter).test(v.textContent.trim())
  })[tableNumber];

  const num = [].indexOf.call(head.parentNode.querySelectorAll('td'), head) + 1;
  const table = head.parentNode.parentNode;

  const columns = table.querySelectorAll('tr td.mtext:nth-child(' + num + '):not([align="center"])')
  return [].map.call(columns, v => v);
};

const convColsToNums = (array) => {
  return array.map((v) => {
    return /^([0-9,]+)/.test(v.textContent) && parseInt(RegExp.$1.replace(/,/g, ''), 10) || null
  }).filter(v => v)
};

const sbiRound = (num) => {
  return Math.round(num * 100) / 100
};

const request = (url, callback) => {
  const xhr = new XMLHttpRequest()

  xhr.onreadystatechange = () => {
    if (xhr.readyState === 4) {
      const container = document.implementation.createHTMLDocument().documentElement
      container.innerHTML = xhr.responseText
      return callback(container)
    }
  }

  xhr.open('GET', url)
  xhr.send()
}
