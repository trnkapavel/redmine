const { Resvg } = require('@resvg/resvg-js')
const fs = require('fs')
const path = require('path')

const [,, src, dest, size = '1024'] = process.argv
const svg = fs.readFileSync(path.resolve(src), 'utf8')
const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: parseInt(size) } })
const png = resvg.render().asPng()
fs.writeFileSync(path.resolve(dest), png)
console.log(`${src} → ${dest} (${size}px)`)
