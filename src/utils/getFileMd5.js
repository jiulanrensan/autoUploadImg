import SparkMD5 from "spark-md5";
const spark = new SparkMD5.ArrayBuffer()
/**
 * 
 * @param {ArrayBuffer} arrayBuffer 
 * @returns { string }
 */
export function genFileMd5 (arrayBuffer) {
  spark.append(arrayBuffer)
  return spark.end()
}