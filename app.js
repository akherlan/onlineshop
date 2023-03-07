import {
  shopeeInstance,
  getPromotionId,
  getItemId,
  getFlashSale
} from "./shopee.js";

const instance = await shopeeInstance();
const promotionData = await getPromotionId(instance);
const activePromo = await promotionData.data[0]; // 0 is current
console.log("Retrieve data %s", activePromo.name);
const itemList = await getItemId(instance, activePromo.url, 34); // fashion muslim
const productList = await getFlashSale(instance, activePromo.promotionid, itemList);
console.log(await productList);
