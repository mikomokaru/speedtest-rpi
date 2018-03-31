'use strict'

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

//TODO 交互にWIFIを変える用
const wifis = [1,2]

const run = (param)=> new Promise((resolve,reject)=> {
	const t = speedTest(param);
	t.on('data',resolve)
	t.on('error',reject)
}
)

const sync = (p)=> new Promise((resolve,reject)=>{
	const client = s3.createClient({s3Client: new AWS.S3({signatureVersion: 'v4'})})
	const uploader = client.uploadDir(p)
	uploader.on('end',resolve)
	uploader.on('error',reject)
})

//15分おきにスピードテストを実行する
Bacon.repeatedly(1000*60*15,wifis)
.doLog()
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
//sync
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
.log()
