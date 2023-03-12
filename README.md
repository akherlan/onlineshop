# Let's Shopping Online!

## Shopee ID

**Racun Shopee** ("Shopee Poison" in Bahasa Indonesia) is a micro influencing and affiliate marketing campaign in Indonesia especially for fashion and beauty products. Usually attract people with showing off OOTD (outfit of the day) looks or make-up preparation and review, then spill and recommend related worth-to-buy products to influence the audiences to purchase on social media.

This repository is contain codes related to micro and lightweight data collecting through Shopee's public API v4 in idea to achieve automation effort as part of my personal affiliate marketing activity.

Another sale data retrieval tool is written on Google Apps Script and available on Google Sheets as a sticking additional menu (hope can be an add-ons in the future). It can be helpful to supply data for manual spreadsheet analytic purposes.

### Caution

Often, the stocks of each tier variation (color, size, type, etc.) do not match at all with the display on the web page. But 0 stock (out of stock) always remains the same. The sold item countings also are not accurate or maybe it has a multiplier factor, etc. Don't know what is it. After all, we may only need information as to whether the item is in stock or out of stock.

```js
{
  // ...

  in_stock: data.stock != null ? Boolean(data.stock) : data.stock,
  models: (() => {
    let variations = [];
    data.models.forEach((item) => {
      variations.push({
        // ...
        in_stock: item.stock != null ? Boolean(item.stock) : item.stock,
        // ...
      });
    });
    return variations;
  }

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

If you experience a different behavior when using this tool, please comment with opening an issue.

## Zalora ID

Zalora scraper is provided for comparison with shops' price offering and product availability on Shopee (maybe also with Tokopedia in upcoming time if possible).

## Disclaimer

Be wise and polite (to the website) to use this simple application.

Please note that Shopee is providing [open API access](https://open.shopee.com/) for massive data load and serious developer to integrate your own application directly. I think it will provide you with more proper and accurate data too.

## Support

Suggestions or contributions for this project are welcome. Please open an issue or email me. Even if you only want to keep in touch, please.

If you feel the project is helpful you can also support me as a sponsor or buy me a coffee (traktir kopi pakai Gopay/OVO/QRIS lewat traktir.id). I can be excited and do more work for future improvement.

I am also available for hire!

Contact: **getdata**[at]**duck**[dot]**com**