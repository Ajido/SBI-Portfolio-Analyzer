'use strict'

// ログイン済みの場合のみ処理を走らせる
const signed = document.querySelectorAll('[name="user_id"], [name="user_password"]').length === 0
if (!signed) {
  console.log(new Date(), 'Waiting for the signin')
} else {

const gift = {};

// ポートフォリオの株式現物特定テーブルを取得
const tokutei = [].filter.call(document.querySelectorAll('td.mtext'), (e) => {
  return /株式\（現物\/特定預り\）/.test(e.textContent)
})[0]

// ポートフォリオの株式現物NISAテーブルを取得
const nisa = [].filter.call(document.querySelectorAll('td.mtext'), (e) => {
  return /株式\（現物\/NISA預り\）/.test(e.textContent)
})[0]

// 特定があれば特定を、なければNISAを使う
const table = (tokutei)
  ? tokutei.parentNode.nextElementSibling.querySelector('table')
  : nisa.parentNode.nextElementSibling.querySelector('table')

// 保有中の銘柄コード・銘柄名・個別リンクを取得
const codes = getColumns(table, '銘柄（コード）').map((e) => {
  if (/^([0-9]+)\s?(.*?)$/.test(e.textContent)) {
    return { code: RegExp.$1, name: RegExp.$2, URL: e.querySelector('a').href };
  }
}).filter((e) => (e))

// 保有銘柄の数量・取得単価・現在値を取得
const nums = convColumnsToNumArray(getColumns(table, /^数量$/))
const costs = convColumnsToNumArray(getColumns(table, /^(参考単価|取得単価)$/))
const nowcosts = convColumnsToNumArray(getColumns(table, /^現在値$/))

const portfolio = []

// ポートフォリオの基礎データ構築
for (let i = 0; i < codes.length; i++) {
  portfolio.push({
    '銘柄コード': codes[i].code,
    '銘柄名': codes[i].name,
    'URL': codes[i].URL,
    '保有株数': nums[i],
    '取得単価': costs[i],
    '現在値': nowcosts[i],
    '評価損益': (nums[i] * nowcosts[i]) - (nums[i] * costs[i]),
    '実質額': nums[i] * costs[i],
    '名目額': nums[i] * nowcosts[i]
  })
}

// ポートフォリオデータのダウンロード関数
const download = (portfolio, summary) => {
  const zip = new JSZip();

  // 基礎データのJSONファイルを保存
  zip.file(`data-${YYYYMMDD()}.json`, JSON.stringify({ portfolio, summary, gift }));

  // 集計データのテキストファイルを保存
  zip.file(`performance-${YYYYMMDD()}.txt`, (() => {
    let data = `ポートフォリオ全体のパフォーマンス集計結果 #${YYYYMMDD()}\r\n\r\n`;

    data += `評価損益プラス分積み上げ計上: ${summary['評価損益プラス分積み上げ計上']}\r\n`;
    data += `評価損益マイナス分積み上げ計上: ${summary['評価損益マイナス分積み上げ計上']}\r\n\r\n`;
    data += `保有株配当金額総計: ${summary['保有株配当金額総計']}\r\n`;
    data += `名目保有株配当金利回り: ${summary['名目保有株配当金利回り']}\r\n`;
    data += `実質保有株配当金利回り: ${summary['実質保有株配当金利回り']}\r\n\r\n`;
    data += `保有株優待額総計: ${summary['保有株優待額総計']}\r\n`;
    data += `名目保有株優待額利回り: ${summary['名目保有株優待額利回り']}\r\n`;
    data += `実質保有株優待額利回り: ${summary['実質保有株優待額利回り']}\r\n\r\n`;
    data += `保有株優待＋配当額総計: ${summary['保有株優待＋配当額総計']}\r\n`;
    data += `名目保有株優待＋配当額利回り: ${summary['名目保有株優待＋配当額利回り']}\r\n`;
    data += `実質保有株優待＋配当額利回り: ${summary['実質保有株優待＋配当額利回り']}\r\n`;

    return data;
  })());

  // 集計データのCSVファイルを保存
  zip.file(`performance-${YYYYMMDD()}.csv`, (() => {
    const data = [
      [
        '評価損益プラス分積み上げ計上',
        '評価損益マイナス分積み上げ計上',
        '保有株配当金額総計',
        '名目保有株配当金利回り',
        '実質保有株配当金利回り',
        '保有株優待額総計',
        '名目保有株優待額利回り',
        '実質保有株優待額利回り',
        '保有株優待＋配当額総計',
        '名目保有株優待＋配当額利回り',
        '実質保有株優待＋配当額利回り'
      ].join(','), [
        summary['評価損益プラス分積み上げ計上'],
        summary['評価損益マイナス分積み上げ計上'],
        summary['保有株配当金額総計'],
        summary['名目保有株配当金利回り'],
        summary['実質保有株配当金利回り'],
        summary['保有株優待額総計'],
        summary['名目保有株優待額利回り'],
        summary['実質保有株優待額利回り'],
        summary['保有株優待＋配当額総計'],
        summary['名目保有株優待＋配当額利回り'],
        summary['実質保有株優待＋配当額利回り']
      ].map((v) => String(v).replace(/,/g, '')).join(',')
    ].join('\r\n');

    const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
    return new Blob([bom, data], { type: 'text/csv' });
  })());

  // 銘柄データのCSVファイルを保存
  zip.file(`portfolio-${YYYYMMDD()}.csv`, (() => {
    let content = '';

    content += [
      '銘柄コード',
      '銘柄名',
      '現在値',
      '取得単価',
      '保有株数',
      '評価損益',
      '実質額',
      '名目額',
      '実質配当利回り',
      '名目配当利回り',
      '実質優待利回り',
      '名目優待利回り',
      '実質配当優待利回り',
      '名目配当優待利回り',
      '保有株配当金額',
      '保有株優待額',
      '優待存在有無',
      'PER',
      'PBR',
      '予想配当',
      'URL',
      '決算',
      '設立',
      '上場',
      '特色',
      '連結事業',
      'コメント１',
      'コメント２',
      '業種',
      '仕入先',
      '販売先',
      '比較会社',
      '本社',
      '支社',
      '従業員',
      '証券',
      '銀行',
      '連結',
      '会社業績修正',
      '浮動株',
      '特定株',
      '四季報URL',
      '時価総額',
      '営業CF',
      '投資CF',
      '財務CF',
      '現金等',
      'ROE',
      '予ROE',
      'ROA',
      '予ROA',
      '総資産',
      '自己資本比率',
      '有利子負債',
      '売上',
      '営業利益',
      '経常利益',
      '純利益',
      '一株利益',
      '一株配当',
      '予想売上',
      '予想営業利益',
      '予想経常利益',
      '予想純利益',
      '予想一株利益',
      '予想一株配当',
      '成長性',
      '割安性',
      '企業規模',
      'テクニカル',
      '財務健全性',
      '市場トレンド'
    ].join(',') + '\r\n';

    portfolio.forEach((data) => {
      content += [
        data['銘柄コード'],
        data['銘柄名'],
        data['現在値'],
        data['取得単価'],
        data['保有株数'],
        data['評価損益'],
        data['実質額'],
        data['名目額'],
        data['実質配当利回り'],
        data['名目配当利回り'],
        data['実質優待利回り'],
        data['名目優待利回り'],
        data['実質配当優待利回り'],
        data['名目配当優待利回り'],
        data['保有株配当金額'],
        data['保有株優待額'],
        data['優待存在有無'],
        data['PER'],
        data['PBR'],
        data['予想配当'],
        data['四季報']['ＵＲＬ'],
        data['四季報']['決算'],
        data['四季報']['設立'],
        data['四季報']['上場'],
        data['四季報']['特色'],
        data['四季報']['連結事業'],
        data['四季報']['コメント１'],
        data['四季報']['コメント２'],
        data['四季報']['業種'],
        data['四季報']['仕入先'],
        data['四季報']['販売先'],
        data['四季報']['比較会社'],
        data['四季報']['本社'],
        data['四季報']['支社'],
        data['四季報']['従業員'],
        data['四季報']['証券'],
        data['四季報']['銀行'],
        data['四季報']['連結'],
        data['四季報']['会社業績修正'],
        data['四季報']['浮動株'],
        data['四季報']['特定株'],
        data['四季報']['四季報リンク'],
        data['財務状況']['時価総額'],
        data['財務状況']['営業CF'],
        data['財務状況']['投資CF'],
        data['財務状況']['財務CF'],
        data['財務状況']['現金等'],
        data['財務状況']['ROE'],
        data['財務状況']['予ROE'],
        data['財務状況']['ROA'],
        data['財務状況']['予ROA'],
        data['財務状況']['総資産'],
        data['財務状況']['自己資本比率'],
        data['財務状況']['有利子負債'],
        data['財務状況']['昨年度']['売上'],
        data['財務状況']['昨年度']['営業利益'],
        data['財務状況']['昨年度']['経常利益'],
        data['財務状況']['昨年度']['純利益'],
        data['財務状況']['昨年度']['一株利益'],
        data['財務状況']['昨年度']['一株配当'],
        data['財務状況']['本年度']['予想売上'],
        data['財務状況']['本年度']['予想営業利益'],
        data['財務状況']['本年度']['予想経常利益'],
        data['財務状況']['本年度']['予想純利益'],
        data['財務状況']['本年度']['予想一株利益'],
        data['財務状況']['本年度']['予想一株配当'],
        data['分析']['成長性'],
        data['分析']['割安性'],
        data['分析']['企業規模'],
        data['分析']['テクニカル'],
        data['分析']['財務健全性'],
        data['分析']['市場トレンド']
      ].map((v) => {
        const value = String(v).replace(/"/g, '').replace('undefined', '');
        return (value.indexOf(',') !== -1) ? `"${value}"` : value;
      }).join(',') + '\r\n';
    });

    const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
    return new Blob([bom, content], { type: 'text/csv' });
  })());

  zip.generateAsync({ type: 'blob' }).then((blob) => {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.target = '_blank'
    a.download = `Portfolio-${YYYYMMDD()}.zip`
    a.click()
  })
}

// ポートフォリオ全体のパフォーマンス集計関数
const aggregate = (portfolio) => {
  const data = {
    '評価損益プラス分積み上げ計上': (() => {
      let sum = 0;
      portfolio.forEach((data) => {
        if (data['評価損益'] > 0 && isFinite(data['評価損益'])) {
          sum += data['評価損益']
        }
      })
      return sum
    })(),
    '評価損益マイナス分積み上げ計上': (() => {
      let sum = 0;
      portfolio.forEach((data) => {
        if (data['評価損益'] < 0 && isFinite(data['評価損益'])) {
          sum += data['評価損益']
        }
      })
      return sum
    })(),
    '保有株配当金額総計': (() => {
      let sum = 0;
      portfolio.forEach((data) => {
        if (isFinite(data['保有株配当金額'])) {
          sum += data['保有株配当金額']
        }
      })
      return sum
    })(),
    '保有株優待額総計': (() => {
      let sum = 0;
      portfolio.forEach((data) => {
        if (isFinite(data['保有株優待額'])) {
          sum += data['保有株優待額']
        }
      })
      return sum
    })(),
    '評価額合計': (() => {
      let sum = 0;
      portfolio.forEach((data) => {
        if (isFinite(data['名目額'])) {
          sum += data['名目額']
        }
      })
      return sum
    })(),
    '実質額合計': (() => {
      let sum = 0;
      portfolio.forEach((data) => {
        if (isFinite(data['実質額'])) {
          sum += data['実質額']
        }
      })
      return sum
    })()
  }

  data['名目保有株配当金利回り'] = (() => {
    return sbiRound(data['保有株配当金額総計'] / data['評価額合計'] * 100)
  })()

  data['実質保有株配当金利回り'] = (() => {
    return sbiRound(data['保有株配当金額総計'] / data['実質額合計'] * 100)
  })()

  data['名目保有株優待額利回り'] = (() => {
    return sbiRound(data['保有株優待額総計'] / data['評価額合計'] * 100)
  })()

  data['実質保有株優待額利回り'] = (() => {
    return sbiRound(data['保有株優待額総計'] / data['実質額合計'] * 100)
  })()

  data['保有株優待＋配当額総計'] = (() => {
    return data['保有株配当金額総計'] + data['保有株優待額総計']
  })()

  data['名目保有株優待＋配当額利回り'] = (() => {
    return sbiRound(data['保有株優待＋配当額総計'] / data['評価額合計'] * 100)
  })()

  data['実質保有株優待＋配当額利回り'] = (() => {
    return sbiRound(data['保有株優待＋配当額総計'] / data['実質額合計'] * 100)
  })()

  console.log(data);
  return data;
}

// ポートフォリオのデータを順次拡充
const getDetails = (index) => {
  if (!index) index = 0
  const data = portfolio[index]

  // 全銘柄情報を更新したらポートフォリオ全体の集計処理を走らせてからダウンロード画面を表示
  if (!data) {
    const summary = aggregate(portfolio)
    setTimeout(download, 500, portfolio, summary)
    return
  }

  // 銘柄個別ページに移動
  request(data.URL, (container) => {
    [].forEach.call(container.querySelectorAll('table[summary="投資指標"] tr > th'), (v) => {
      const txt = v.nextElementSibling.textContent;

      if (/予想EPS/.test(v.textContent)) data['PER'] = sbiRound(data['現在値'] / Number(txt.replace(/,/g, '')));
      if (/実績BPS/.test(v.textContent)) data['PBR'] = sbiRound(data['現在値'] / Number(txt.replace(/,/g, '')));

      if (/予想1株配当/.test(v.textContent)) {
        data['予想配当'] = parseInt(txt.replace(/,/g, ''), 10);
        if (/～/.test(txt)) data['予想配当'] = parseInt(txt.split('～').shift().replace(/,/g, ''), 10);

        data['名目配当利回り'] = sbiRound((data['予想配当'] / data['現在値']) * 100);

        const bonusRate = data['名目配当利回り'];

        data['名目配当利回り'] = bonusRate;
        data['実質配当利回り'] = sbiRound(bonusRate * (data['現在値'] / data['取得単価']));
        data['保有株配当金額'] = data['予想配当'] * data['保有株数'];

        const giftRate = sbiRound(((gift[data['銘柄コード']] || 0) / (data['現在値'] * data['保有株数'])) * 100);

        data['名目優待利回り'] = giftRate;
        data['実質優待利回り'] = sbiRound(giftRate * (data['現在値'] / data['取得単価']));
        data['保有株優待額'] = gift[data['銘柄コード']] || 0;

        data['実質配当優待利回り'] = data['実質配当利回り'] + data['実質優待利回り'];
        data['名目配当優待利回り'] = data['名目配当利回り'] + data['名目優待利回り'];
      }
    });

    const giftUrl = [].filter.call(container.querySelectorAll('[name="FormKabuka"] [class*="tab"] a'), (v) => {
      return /株主優待/.test(v.textContent);
    })[0].getAttribute('href');

    // 株主優待ページに移動
    request(giftUrl, (giftContainer) => {
      [].forEach.call(giftContainer.querySelectorAll('.tbl690 tr th'), (v) => {
        if (/^優待利回り$/.test(v.textContent)) data['優待存在有無'] = v.nextElementSibling.textContent.trim();
      });

      const repUrl = [].filter.call(container.querySelectorAll('[name="FormKabuka"] [class*="tab"] a'), (v) => {
        return /四季報/.test(v.textContent);
      })[0].getAttribute('href');

      data['四季報'] = { '四季報リンク': document.location.origin + repUrl };

      // 四季報ページに移動
      request(repUrl, (repContainer) => {
        const keys = [
          'ＵＲＬ', '決算', '設立', '上場', '特色', '連結事業', '業種', '仕入先',
          '販売先', '比較会社', '本社', '支社', '従業員', '証券', '銀行', '連結', '会社業績修正'
        ];

        if (repContainer.querySelectorAll('.shikihouBox01 table')[0]) {
          repContainer.querySelectorAll('.shikihouBox01 table')[0].textContent.split(/[\r\n]/).forEach((v) => {
            if (/【([^】]+)】(.*?)$/.test(v)) {
              if (keys.indexOf(RegExp.$1) !== -1) {
                data['四季報'][RegExp.$1] = RegExp.$2;
              } else if (RegExp.$1 === '四半期進捗率' && !data['四季報']['会社業績修正']) {
                data['四季報']['会社業績修正'] = RegExp.$2;
              } else {
                if (!data['四季報']['コメント１']) {
                  data['四季報']['コメント１'] = '【' + RegExp.$1 + '】 ' + RegExp.$2;
                } else if (!data['四季報']['コメント２']) {
                  data['四季報']['コメント２'] = '【' + RegExp.$1 + '】 ' + RegExp.$2;
                }
              }
            }
          });

          const stocks = repContainer.querySelectorAll('.shikihouBox01 > table table:nth-child(2) tr > td:nth-child(3)');
          data['四季報']['浮動株'] = Number(stocks[0].textContent.trim().replace('%', ''));
          data['四季報']['特定株'] = Number(stocks[1].textContent.trim().replace('%', ''));
        }

        let finRepUrl;

        if (repContainer.querySelectorAll('.shikihouBox01 table')[0]) {
          finRepUrl = [].filter.call(repContainer.querySelectorAll('[class*="tab"] a'), (v) => {
            return /財務状況/.test(v.textContent);
          })[0].getAttribute('href');
        } else {
          finRepUrl = repUrl;
        }

        data['財務状況'] = {};

        // 財務状況ページに移動
        request(finRepUrl, (finRepContainer) => {
          const keys = [
            '時価総額', '営業CF', '投資CF', '財務CF', '現金等',
            'ROE', 'ROA', '総資産', '自己資本比率', '有利子負債'
          ];

          [].forEach.call(finRepContainer.querySelectorAll('.shikihouBox01 > table:nth-child(3) td.mtext:not([align="right"])'), (v) => {
            const key = v.textContent.trim();

            if (keys.indexOf(key) !== -1) {
              if (key === '時価総額') {
                data['財務状況'][key] = v.nextElementSibling.textContent.trim().replace(/\[[0-9]+\]$/, '');
              } else {
                data['財務状況'][key] = Number(v.nextElementSibling.textContent.trim().replace(/[%,]/g, ''));
              }
            }

            if (key === 'ROA' || key === 'ROE') {
              data['財務状況']['予' + key] = Number(v.nextElementSibling.nextElementSibling.textContent.trim().replace(/[予%]/g, ''));
            }
          });

          let cur, prev;

          [].forEach.call(finRepContainer.querySelectorAll('.shikihouBox01 > table:nth-child(2) table td.mtext[align="left"]'), (v) => {
            const key = v.textContent.trim();
            if (/^(連|単|◇|◎)/.test(key) === false) return;

            if (/予/.test(key) && !cur) cur = v;
            if (!cur) prev = v;
          });

          data['財務状況']['昨年度'] = {};
          data['財務状況']['本年度'] = {};

          if (cur && prev) {
            data['財務状況']['昨年度'] = {
              '売上': Number(prev.nextElementSibling.textContent.trim().replace(/,/g, '')),
              '営業利益': Number(prev.nextElementSibling.nextElementSibling.textContent.trim().replace(/,/g, '')),
              '経常利益': Number(prev.nextElementSibling.nextElementSibling.nextElementSibling.textContent.trim().replace(/,/g, '')),
              '純利益': Number(prev.nextElementSibling.nextElementSibling.nextElementSibling.nextElementSibling.textContent.trim().replace(/,/g, '')),
              '一株利益': Number(prev.nextElementSibling.nextElementSibling.nextElementSibling.nextElementSibling.nextElementSibling.textContent.trim().replace(/,/g, '')),
              '一株配当': Number(prev.nextElementSibling.nextElementSibling.nextElementSibling.nextElementSibling.nextElementSibling.nextElementSibling.textContent.trim().replace(/,/g, '').replace(/[特記]/g, '').split('～').pop())
            };

            data['財務状況']['本年度'] = {
              '予想売上': Number(cur.nextElementSibling.textContent.trim().replace(/,/g, '')),
              '予想営業利益': Number(cur.nextElementSibling.nextElementSibling.textContent.trim().replace(/,/g, '')),
              '予想経常利益': Number(cur.nextElementSibling.nextElementSibling.nextElementSibling.textContent.trim().replace(/,/g, '')),
              '予想純利益': Number(cur.nextElementSibling.nextElementSibling.nextElementSibling.nextElementSibling.textContent.trim().replace(/,/g, '')),
              '予想一株利益':  Number(cur.nextElementSibling.nextElementSibling.nextElementSibling.nextElementSibling.nextElementSibling.textContent.trim().replace(/,/g, '')),
              '予想一株配当':  Number(cur.nextElementSibling.nextElementSibling.nextElementSibling.nextElementSibling.nextElementSibling.nextElementSibling.textContent.trim().replace(/,/g, '').replace(/[特記]/g, '').split('～').pop())
            };
          }

          const analyzeUrl = [].filter.call(container.querySelectorAll('[name="FormKabuka"] [class*="tab"] a'), (v) => {
            return /分析/.test(v.textContent);
          })[0].getAttribute('href');

          data['分析'] = {};

          // 分析ページに移動
          request(analyzeUrl, (analyzeContainer) => {
            const formDataOrigin = new FormData(analyzeContainer.querySelectorAll('form[name="formSwitch"]')[0]);
            const formData = new URLSearchParams();

            for (const key of formDataOrigin.keys()) {
              formData.append(key, formDataOrigin.get(key));
            }

            const xhr = new XMLHttpRequest();

            xhr.onreadystatechange = () => {
              if (xhr.readyState === 4) {
                const container = document.implementation.createHTMLDocument().documentElement;
                container.innerHTML = xhr.responseText;

                const keys = ['成長性', '割安性', '企業規模', 'テクニカル', '財務健全性', '市場トレンド'];
                [].forEach.call(container.querySelectorAll('table[summary="ランク"] tr > th'), (v) => {
                  if (keys.indexOf(v.textContent.trim()) !== -1) {
                    data['分析'][v.textContent.trim()] = Number(v.nextElementSibling.nextElementSibling.textContent.trim());
                  }
                });

                console.log(data);
                getDetails(index + 1);
              }
            }

            xhr.open('POST', 'https://www.kabumap.com/servlets/Query');
            xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
            xhr.send(formData.toString().replace(/%20/g, '+'));
          });
        });
      });
    });

  });
}

const pageing = (pageUrl) => {
  request(pageUrl, (pageContainer) => {
    // ポートフォリオの株式現物特定テーブルを取得
    const tokutei = [].filter.call(pageContainer.querySelectorAll('td.mtext'), (e) => {
      return /株式\（現物\/特定預り\）/.test(e.textContent)
    })[0]

    // ポートフォリオの株式現物NISAテーブルを取得
    const nisa = [].filter.call(pageContainer.querySelectorAll('td.mtext'), (e) => {
      return /株式\（現物\/NISA預り\）/.test(e.textContent)
    })[0]

    // 特定があれば特定を、なければNISAを使う
    const table = (tokutei)
      ? tokutei.parentNode.nextElementSibling.querySelector('table')
      : nisa.parentNode.nextElementSibling.querySelector('table')

    // 保有中の銘柄コード・銘柄名・個別リンクを取得
    const codes = getColumns(table, '銘柄（コード）').map((e) => {
      if (/^([0-9]+)\s?(.*?)$/.test(e.textContent)) {
        return { code: RegExp.$1, name: RegExp.$2, URL: e.querySelector('a').getAttribute('href') };
      }
    }).filter((e) => (e))

    // 保有銘柄の数量・取得単価・現在値を取得
    const nums = convColumnsToNumArray(getColumns(table, /^数量$/))
    const costs = convColumnsToNumArray(getColumns(table, /^(参考単価|取得単価)$/))
    const nowcosts = convColumnsToNumArray(getColumns(table, /^現在値$/))

    // ポートフォリオの基礎データ構築
    for (let i = 0; i < codes.length; i++) {
      portfolio.push({
        '銘柄コード': codes[i].code,
        '銘柄名': codes[i].name,
        'URL': codes[i].URL,
        '保有株数': nums[i],
        '取得単価': costs[i],
        '現在値': nowcosts[i],
        '評価損益': (nums[i] * nowcosts[i]) - (nums[i] * costs[i]),
        '実質額': nums[i] * costs[i],
        '名目額': nums[i] * nowcosts[i]
      })
    }

    const pages = [].filter.call(pageContainer.querySelectorAll('td.mtext > a'), (v) => /次へ→/.test(v.textContent));
    if (pages.length > 0) {
      pageing(pages[0].getAttribute('href'))
    } else {
      getDetails();
    }
  })
}

const main = () => {
  const pages = [].filter.call(document.querySelectorAll('td.mtext > a'), (v) => /次へ→/.test(v.textContent));
  if (pages.length > 0) {
    pageing(pages[0].href)
  } else {
    getDetails();
  }
};

const {dialog} = require('electron').remote;
const fs = require('fs');

alert('優待価格のリストファイルを選択します');

dialog.showOpenDialog({
  properties: ['openFile'],
  filters: [
    { name: 'CSV', extensions: ['csv'] },
    { name: 'Text File', extensions: ['txt'] },
    { name: 'JSON File', extensions: ['json'] }
  ]
}, (files) => {
  if (Array.isArray(files) && files.length === 1) {
    const file =  files[0];

    fs.readFile(file, 'utf8', (err, data) => {
      if (/\.json$/.test(file)) {
        try {
          const json = JSON.parse(data.trim());
          Object.keys(json).forEach((key) => {
            gift[String(key)] = Number(json[key]);
          });
        } catch (e) {
          alert('優待価格リストの書式が間違っています');
        }
      } else {
        data.split(/[\r\n]+/).forEach((line) => {
          if (/^([0-9]+).*?([0-9]+)/.test(line.trim())) {
            gift[String(RegExp.$1)] = Number(RegExp.$2);
          }
        });
      }

      console.log(gift);
      return main();
    });
  } else {
    dialog.showMessageBox({
      type: 'warning',
      message: '優待価格リストの設定を行わずに集計を開始します',
      buttons: ['OK']
    }, () => {
      return main();
    });
  }
});

}
