'use strict';

// ポートフォリオページから任意のテーブルの列データを抽出する
const getColumns = (table, name) => {
  const headers = [].filter.call(table.querySelectorAll('td.mtext[align="center"]'), e => e)
  const column = headers.indexOf([].filter.call(table.querySelectorAll('.mtext'), (e) => {
    return new RegExp(name).test(e.textContent.trim())
  }).shift())

  const columns = table.querySelectorAll('tr td.mtext:nth-child(' + (column + 1) + '):not([align="center"])')
  return [].map.call(columns, v => v)
};

// 数値で構成されたtextContentを含むエレメントの配列を数値型配列に変換する
const convColumnsToNumArray = (array) => {
  return array.map((e) => {
    return /^([0-9,\.]+)/.test(e.textContent) && Number(RegExp.$1.replace(/,/g, '')) || null
  }).filter(e => e)
}

// 少数点第二四捨五入関数
const sbiRound = (num) => {
  return Math.round(num * 100) / 100
}

// 汎用リクエスト関数
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
