import * as shopee from './shopee.js';

var url = 'https://shopee.co.id/Audio-Technica-ATH-M20xBT-Wireless-Over-Ear-Headphones-i.5696604.15949131744';
var product_detail = await shopee.get_shopee_product_detail(url);
console.log(product_detail);