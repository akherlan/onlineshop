import { Shopee } from "./shopee.js";
import { ShopeeFlashSale } from "./shopee_flashsale.js";
import { getShopeeProductDetail } from "./shopee_product.js"
import { Zalora } from "./zalora.js";
// import * as fs from 'fs';

/**
 * Shopee fashion muslim 
 * 
 */
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
var fashionMuslim = await getShopeeFlashSaleFashionMuslim();
console.log(fashionMuslim);
// console.log(await Shopee.getCategory());

/**
 * Product detail
 * 
 */
var url = "https://shopee.co.id/GFS-3412-CELANA-KULOT-CRINCLE-PREMIUM-ANTI-KUSUT-2-i.5825746.22420129082?sp_atk=6e0215e0-ea30-4373-9cc6-19c6a799abdb&xptdk=6e0215e0-ea30-4373-9cc6-19c6a799abdb";
var productDetail = await getShopeeProductDetail(url);
console.log(productDetail);


/**
 * Zalora
 * 
 */
var url = "https://www.zalora.co.id/women/pakaian/rok/"
var data = await Zalora.getProduct(url, 1);
if (!data.error) {
  data.forEach((item, i) => { console.log("%s: %s <%s>", i+1, item.name, item.link); });
  // console.log(data[0]);
} else {
  console.log(data);
};
