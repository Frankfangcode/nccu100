/**
 * 進入點：main.js 最後面（在工具箱 flushPrefabs 之後、鏡頭防穿模 buildOccluders 之前）引入這個檔案，
 * 把蓋好的室外場景做一次靜態烘焙。
 */
import { flushBake } from './index.js';
import { EXPORT } from '../../core/export-mode.js';

if (!EXPORT) flushBake();
