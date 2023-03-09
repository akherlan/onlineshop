import { Shopee, ShopeeFlashSale } from "./shopee.js";
import * as fs from 'fs';


const getShopeeFlashSaleFashionMuslim = async() => {
  // look into flash sale promotion list
  const promotionData = await ShopeeFlashSale.getPromotion();
  const session = 0; // 0 is current flash sale session
  const activePromo = await promotionData[session];
  console.info("Retrieve data %s", activePromo.name);
  const itemList = await ShopeeFlashSale.getItem(activePromo.url, 34);
  // 34 is fashion muslim category, look at ShopeeFlashSale.getCategory(0) for more
  const productList = await ShopeeFlashSale.getFlashSale(activePromo.promotionid, itemList);
  console.info("Item count: %s", productList.length);
  return productList;
}

// var fashionMusilim = await getShopeeFlashSaleFashionMuslim();
// console.log(fashionMusilim);

console.log(await Shopee.getCategory());