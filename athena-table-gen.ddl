CREATE EXTERNAL TABLE `journal`(
  `shop_code` smallint, 
  `count_date_ts` timestamp, 
  `event_datetime` timestamp, 
  `slip_no` int, 
  `row_no` smallint, 
  `type` string, 
  `message` string)
PARTITIONED BY ( 
  `year` smallint, 
  `month` smallint, 
  `count_date` date)
ROW FORMAT SERDE 
  'org.apache.hadoop.hive.ql.io.parquet.serde.ParquetHiveSerDe' 
STORED AS INPUTFORMAT 
  'org.apache.hadoop.mapred.TextInputFormat' 
OUTPUTFORMAT 
  'org.apache.hadoop.hive.ql.io.HiveIgnoreKeyTextOutputFormat'
LOCATION
  's3://sales-stream.yamaokaya.net/JOURNAL'
TBLPROPERTIES (
  'has_encrypted_data'='false', 
  'transient_lastDdlTime'='1510903421')