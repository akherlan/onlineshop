# Let's Shopping Online!

## Shopee ID

The original idea of the scraper was coming from Racun Shopee.

**Racun Shopee** ("Shopee Poison") is a micro influencing and affiliate marketing campaign in Indonesia especially for fashion and beauty products. Usually attract people with showing off OOTD (outfit of the day) looks or make-up preparation and review, then spill and recommend related worth-to-buy products to influence the audiences to purchase on social media.

This repository is contain codes related to micro and lightweight data collecting through Shopee's public API v4 in idea to achieve automation effort as part of my personal affiliate marketing activity.

Another sale data retrieval tool is written on Google Apps Script and available on Google Sheets as a sticking additional menu (hope can be an add-ons in the future). It can be helpful to supply data for manual spreadsheet analytic purposes.

## Usage

Clone this repository and direct to the project working directory.

The project is using Axios module in Node.js. For running the code you need to install Node.js on your local machine and install required dependencies from `package.json` using npm (Node.js package manager):

```bash
npm install
```

Accessing `flash_catid` (flash sale category id) which useful for filtering flash sale products by their category.

```js
import { get_flash_catid } from './shopee.js';

var catids = await get_flash_catid().then(({ data }) => { return data });
console.log(catids);
```

You will use the category id on the following function:

```js
import { get_shopee_flashsale } from './shopee.js';

var products = await get_shopee_flashsale(41); // computers and accessories
products.forEach((item, index) => { console.log('%s: %s', index+1, item.name); });
```

When product URL is ready, accessing to the product detail is as follows:

```js
import { get_shopee_product_detail } from './shopee.js'

var url = 'https://shopee.co.id/product/5696604/15949131744';
var product_detail = await get_shopee_product_detail(url);
console.log(product_detail);
```

You can also using product URL from the browser url bar like:

```
https://shopee.co.id/Audio-Technica-ATH-M20xBT-Wireless-Over-Ear-Headphones-i.5696604.15949131744
```

To get list of available products from shop:

```js
import { get_shopee_shop_product } from './shopee.js'

var response = get_shopee_shop_product('xiaomi.official.id'); // 51925611
response.then((data) => {
  data.forEach((item, index) => { console.log('%s: %s', index+1, item.name); });
});
``` 

It can also use shopid instead of username as an argument, e.g. `51925611`.

Get shop argument from url:

- `https://shopee.co.id/shop/51925611`
- `https://shopee.co.id/xiaomi.official.id`

If you need product list from certain category, you can get the list using its url as follows:

```js
import { get_shopee_category_product } from './shopee.js'

var url = 'https://shopee.co.id/Komputer-Aksesoris-cat.11044364';
var response = get_shopee_category_product(url);
response.then((data) => {
  data.forEach((item, index) => { console.log('%s: %s', index+1, item.name); });
});
```

Allowed format for category url is when they contain 8 digits of number, e.g. `___cat.xxxxxxxx` or `___cat.xxxxxxxx.xxxxxxxx` (`xxxxxxxx` is a numeric indicate the category id).

Example allowed url format:

- `https://shopee.co.id/Tas-Wanita-cat.11042642`
- `https://shopee.co.id/Tas-Selempang-Bahu-Wanita-cat.11042642.11042656`
- `https://shopee.co.id/Kacamata-Aksesoris-cat.11042921.11042952`

### Caution

Often, the stocks of each tier variation (color, size, type, etc.) returned from product page do not match at all with the display on the web page. But 0 stock (out of stock) always remains the same. The sold item countings also are not accurate or maybe it has a multiplier factor, etc. Don't know what is it. After all, we may only need information as to whether the item is in stock or out of stock.

```js
{
  // ...

  in_stock: data.stock != null ? Boolean(data.stock) : data.stock,
  models: (() => {
    return data.models.map((item) => {
      return {
        // ...
        in_stock: item.stock != null ? Boolean(item.stock) : item.stock,
        // ...
      };
    });
  })()

  // ...
}
```

The average rating is also often not the same as rating star on the product page. However, the review count remains the same. So, we can count it by ourselves:

```js
{
  // ...

  item_rating: (() => {
    var sumcount = 0;
    data.item_rating.rating_count.forEach((num, index) => {
      sumcount += num * index
    });
    data.item_rating.rating_star = sumcount / data.item_rating.rating_count[0];
    return data.item_rating;
  })()
  
  // ...
}
```

The price nominal from the product detail collector sucks like a random number. They will change if you access from a different IP/country (I tested using VPN). Please only use pricing detail from the sale retriever, or create a webpage scraper instead. For this reason, I am not including pricing data returned from product item request.

After all, the stock, price, and rating of products are good if they retrieve from flashsale and shop product lists.

If you experience a different behavior when using this tool, please comment with opening an issue.

## Zalora ID

Zalora scraper is provided as an alternative and also a comparison with shops' price offerings and product availability on Shopee (maybe with Tokopedia in the upcoming version if possible).

## Disclaimer

Be wise and polite (to the website) to use this simple application. The author is not responsible if your IP address is blocked by the data owner/provider as a result of using an application that burdens their server.

Please note that Shopee is providing [open API access](https://open.shopee.com/) for massive data load and serious developer to integrate your own application directly. I think it will provide you with more proper and accurate data too.

## Support

Contributions to this project are welcome. Please open an issue or make a pull request. By submitting a pull request means you agree to [license your contribution](LICENSE) under the MIT license to this project.

You can also email me for suggestions.

If you feel the project is helpful and want me to improve the project, you can also support me as a sponsor or [buy me a coffee](https://ko-fi.com/andiherlan) (traktir kopi bisa juga pakai **QRIS**/**Gopay**/**OVO**/**Dana**/transfer bank dll. lewat [saweria.co](https://saweria.co/andiherlan)). I can be excited and do more work for future improvement.

I am also available for hire!

Email: **getdata** [at] **duck.com**