const https = require('https')
const querystring = require('querystring')
const program = require('commander')
const iconv = require('iconv-lite')

with (program) {
  option('-c, --code <n>', '銘柄コード', parseInt)
  option('-g, --group <n>', 'グループ番号', parseInt)
  option('-p, --price <n>', '取得価格', parseFloat)
  option('-v, --volume <n>', '取得株数', parseInt)
  option('-m, --memo <memo>', 'メモ')
  parse(process.argv)
}

if (!isFinite(program.code) || !isFinite(program.group)) {
  console.error('no code or group given')
}

const postData = querystring.stringify({
  'code': program.code,
  'groupNo': program.group,
  'group': program.group,
  'price': program.price || '',
  'volume': program.volume || '',
  'aType': 'addEasy'
}) + '&memo=' + escape(iconv.encode(program.memo, 'shift_jis').toString('binary'))

const req = https.request({
  hostname: 'shikiho.jp',
  port: 443,
  path: '/services/Query?SRC=shikiho/my/list/base',
  method: 'POST',
  headers: {
    'content-length': Buffer.byteLength(postData),
    'origin': 'https://shikiho.jp',
    'accept-encoding': 'deflate, br',
    'accept-language': 'ja,en-US;q=0.8,en;q=0.6',
    'cookie': 'YOUR COOKIE',
    'pragma': 'no-cache',
    'upgrade-insecure-requests': '1',
    'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/55.0.2883.95 Safari/537.36',
    'content-type': 'application/x-www-form-urlencoded',
    'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'cache-control': 'no-cache',
    'authority': 'shikiho.jp',
    'referer': 'https://shikiho.jp/services/Query?SRC=shikiho/my/list/edit/base',
    'dnt': '1'
  }
}, (res) => {
  var rawData = ''
  res.setEncoding('utf8')

  res.on('data', (chunk) => {
    rawData += chunk;
  })

  res.on('end', () => {
    console.log(JSON.stringify({
      data: {
        code: program.code,
        group: program.group,
        price: program.price || '',
        volume: program.volume || '',
        memo: program.memo
      }, statusCode:  res.statusCode
    }))
  })
})

req.write(postData)
req.on('error', (e) => console.error(e))
req.end()
