'use strict'

// ログイン済みの場合のみ処理を走らせる
const signed = document.querySelectorAll('[name="user_id"], [name="user_password"]').length === 0
if (!signed) {
  console.log(new Date(), 'Waiting for the signin')
} else {

const gift = { '2193': 7000 };

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
const download = (portfolio) => {
  const blob = new Blob([JSON.stringify(portfolio)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.target = '_blank'
  a.download = 'portfolio-' + Date.now() + '.json'
  a.click()

  // const bom = new Uint8Array([0xEF, 0xBB, 0xBF])
  // const blob = new Blob([bom, content], { type: 'text/csv' })
}

// ポートフォリオのデータを順次拡充
const getDetails = (index) => {
  if (!index) index = 0
  const data = portfolio[index]

  // すべての銘柄データを更新したらポートフォリオデータのダウンロード画面を表示する
  if (!data) {
    console.log('finished')
    setTimeout(download, 500, portfolio)
    return
  }

  // 銘柄個別ページに移動
  request(data.URL, (container) => {
    [].forEach.call(container.querySelectorAll('table[summary="投資指標"] tr > th'), (v) => {
      const txt = v.nextElementSibling.textContent;

      if (/予想EPS/.test(v.textContent)) data['PER'] = sbiRound(data['現在値'] / Number(txt));
      if (/実績BPS/.test(v.textContent)) data['PBR'] = sbiRound(data['現在値'] / Number(txt));

      if (/予想1株配当/.test(v.textContent)) {
        // 仕様: 予想配当には予想1株配当(大)を採用する（クライアント要求）
        data['予想配当'] = parseInt(txt, 10);
        if (/～/.test(txt)) data['予想配当'] = parseInt(txt.split('～').pop(), 10);

        // 仕様: 名目配当利回りには予想1株配当(小)を採用する（SBI基準）
        data['名目配当利回り'] = (data['予想配当'] / data['現在値']) * 100;
        if (/～/.test(txt)) data['名目配当利回り'] = (parseInt(txt.split('～').shift(), 10) / data['現在値']) * 100;

        const bonusRate = sbiRound(data['名目配当利回り']);

        data['名目配当利回り'] = bonusRate;
        data['実質配当利回り'] = sbiRound(bonusRate * (data['現在値'] / data['取得単価']));
        data['保有株配当金額'] = data['現在値'] * data['保有株数'] * bonusRate;

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

        repContainer.querySelectorAll('.shikihouBox01 table')[0].textContent.split(/[\r\n]/).forEach((v) => {
          if (/【([^】]+)】(.*?)$/.test(v)) {
            if (keys.indexOf(RegExp.$1) !== -1) {
              data['四季報'][RegExp.$1] = RegExp.$2;
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

        const finRepUrl = [].filter.call(repContainer.querySelectorAll('[class*="tab"] a'), (v) => {
          return /財務状況/.test(v.textContent);
        })[0].getAttribute('href');

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
                data['財務状況'][key] = v.nextElementSibling.textContent.trim();
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
            if (/^(連|◇)/.test(key) === false) return;

            if (/予/.test(key) && !cur) cur = v;
            if (!cur) prev = v;
          });

          data['財務状況']['昨年度'] = {
            '売上': Number(prev.nextElementSibling.textContent.trim().replace(/,/g, '')),
            '営業利益': Number(prev.nextElementSibling.nextElementSibling.textContent.trim().replace(/,/g, '')),
            '経常利益': Number(prev.nextElementSibling.nextElementSibling.nextElementSibling.textContent.trim().replace(/,/g, '')),
            '純利益': Number(prev.nextElementSibling.nextElementSibling.nextElementSibling.nextElementSibling.textContent.trim().replace(/,/g, '')),
            '一株利益': Number(prev.nextElementSibling.nextElementSibling.nextElementSibling.nextElementSibling.nextElementSibling.textContent.trim().replace(/,/g, '')),
            '一株配当': Number(prev.nextElementSibling.nextElementSibling.nextElementSibling.nextElementSibling.nextElementSibling.nextElementSibling.textContent.trim().replace(/,/g, '').split('～').pop())
          };

          data['財務状況']['本年度'] = {
            '予想売上': Number(cur.nextElementSibling.textContent.trim().replace(/,/g, '')),
            '予想営業利益': Number(cur.nextElementSibling.nextElementSibling.textContent.trim().replace(/,/g, '')),
            '予想経常利益': Number(cur.nextElementSibling.nextElementSibling.nextElementSibling.textContent.trim().replace(/,/g, '')),
            '予想純利益': Number(cur.nextElementSibling.nextElementSibling.nextElementSibling.nextElementSibling.textContent.trim().replace(/,/g, '')),
            '予想一株利益':  Number(cur.nextElementSibling.nextElementSibling.nextElementSibling.nextElementSibling.nextElementSibling.textContent.trim().replace(/,/g, '')),
            '予想一株配当':  Number(cur.nextElementSibling.nextElementSibling.nextElementSibling.nextElementSibling.nextElementSibling.nextElementSibling.textContent.trim().replace(/,/g, '').split('～').pop())
          };

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

getDetails();
}
