'use strict'

const fs = require('fs')
const os = require('os')
const _ = require('lodash')
const Bacon = require('baconjs')
const AWS = require('aws-sdk')
AWS.config.update({
	region: 'ap-northeast-1'
})

const s3 = require('s3')
const speedTest = require('speedtest-net')

// console.log(
// 	_.chain(os.networkInterfaces())
// 	.pick(['wlan0','en0'])
// 	//.head()
// 	.value()
// )

const run = (param)=> new Promise((resolve,reject)=> {
	const t = speedTest(param);
	t.on('data',resolve)
	t.on('error',reject)
}
)

const machineId = 'machine-Id'

const syncParams = {
	localDir: './data',
	deleteRemoved: false,
	s3Params: {
		Bucket: 'wifi-speed.yamaokaya.net',
		Prefix: `results/machineId=${machineId}/`
	}
}

const sync = ()=> new Promise((resolve,reject)=>{
	const uploader = client.uploadDir(syncParams)
	uploader.on('end',resolve)
	uploader.on('error',reject)
})

const client = s3.createClient({s3Client: new AWS.S3({signatureVersion: 'v4'})})

Bacon.fromPromise(run({maxTime: 5000}))
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
.map(sync)
.flatMap(Bacon.fromPromise)
.onValue(console.log)


// var test = speedTest({maxTime: 5000})

// test.on('data', data => {
//   console.dir(data);
// });

// test.on('error', err => {
//   console.error(err);
// });
