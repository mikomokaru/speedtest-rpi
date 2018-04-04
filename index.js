'use strict'
const util = require('util')
const path = require('path')
// const exec = require('child-process-promise').exec
const fs = require('fs')
const os = require('os')
const _ = require('lodash')
const Bacon = require('baconjs')
const machineId = require("node-machine-id")
const AWS = require('aws-sdk')
AWS.config.update({
	region: 'ap-northeast-1'
})

const s3 = require('s3')
const speedTest = require('speedtest-net')

const unlink = util.promisify(fs.unlink)
const readdir = util.promisify(fs.readdir)
// const copy = util.promisify(fs.copyFile)
// const access = util.promisify(fs.access)

//TODO 交互にWIFIを変える用
const wifis = [
	'supplicants/yamaokaya.conf',
	'supplicants/pjn.conf'
]

const run = (param)=> new Promise((resolve,reject)=> {
	const t = speedTest(param);
	t.on('data',resolve)
	t.on('error',reject)
})

const sync = (p)=> new Promise((resolve,reject)=>{
	const client = s3.createClient({s3Client: new AWS.S3({signatureVersion: 'v4'})})
	const uploader = client.uploadDir(p)
	uploader.on('end',resolve)
	uploader.on('error',reject)
})


const del = ()=> readdir('./data')
.then((v)=>	
	v.map((w)=>
		unlink(path.resolve('./data',w))
	)
)
.then(Promise.all.bind(Promise))


//17分おきにスピードテストを実行する
Bacon.repeatedly(1000*60*17,wifis)
//WIFIを交互に入れ替え
// .map((v)=> copy(v,'./wpa_supplicant.conf'))
// .flatMap(Bacon.fromPromise)
//ネットワークインターフェイスを再起動
// .map((v)=> exec('ifconfig wlan0 down && ifconfig wlan0 up'))
// .flatMap(Bacon.fromPromise)
.map(run({maxTime: 5000}))
.flatMap(Bacon.fromPromise)
.map((v)=>
	_.assign(
		v,
		{
			interfaces: 
			_.chain(os.networkInterfaces())
			.pick(['wlan0','en0'])
			.value()
		}
	)
)
.map((v)=>
	fs.writeFileSync(`data/${Date.now()}.json`,JSON.stringify(v))
)
.log()

//13分おきにs3 syncを実行する
Bacon.repeatedly(1000*60*13,wifis)
.map((v)=> machineId.machineId())
.flatMap(Bacon.fromPromise)
.flatMap( (v)=> Bacon.combineTemplate({
	localDir: './data',
	deleteRemoved: false,
	s3Params: {
		Bucket: 'wifi-speed.yamaokaya.net',
		Prefix: `results/machineId=${v}/`
	}
}))
.map(sync)
.flatMap(Bacon.fromPromise)
.map(del)
.flatMap(Bacon.fromPromise)
.log()

