import axios from "axios";
import * as utils from "./utils.js";

const PRETEND_TO_BE_A_BROWSER = 'Mozilla/5.0 (X11; Linux x86_64) '
  + 'AppleWebKit/537.36 (KHTML, like Gecko) '
  + 'Chrome/110.0.0.0 Safari/537.36';

const shopeeInstance = async() => {
  return await axios.create({
    baseURL: "https://shopee.co.id/api/v4",
    timeout: 10000,
    headers: {
      "User-Agent": PRETEND_TO_BE_A_BROWSER,
      "Content-Type": "application/json"
    }
  });
}

const parseShopeeUrl = (url) => {
  var re1 = /i(\.\d+){2}\/?$/;
  var re2 = /product(\/\d+){2}\/?$/;
  var url = url.split("?")[0];
  if (re1.test(url)) {
    var text = url.match(re1)[0];
  } else if (re2.test(url)) {
    var text = url.match(re2)[0];
  } else {
    return null
  }
  var matchText = [ ...text.matchAll(/\d+/g) ];
  var [ shopid, itemid ] = [ matchText[0][0], matchText[1][0]];
  return [ shopid, itemid ];
}

const getProductDetail = async(instance, productUrl) => {
  const [ shopid, itemid ] = parseShopeeUrl(productUrl);
  const base = "https://shopee.co.id/api/v4/item/get";
  const params = {
    itemid: itemid,
    shopid: shopid
  };
  const url = base.addQuery(params);
  instance.defaults.headers["af-ac-enc-dat"] = null;
  return await instance.get(url)
    .then(async(response) => { return await response.data; })
    .catch((error) => { return { "error": true, "message": error.message }; });
}

const parseProductDetail = (data) => {
  const parseCategory = (data, key, subkey) => {
    let cats = [];
    data[key].forEach((cat) => { cats.push(cat[subkey]); });
    return cats;
  };
  const product = {
    shopid: data.shopid,
    itemid: data.itemid,
    brand_id: data.brand_id,
    brand: data.brand,
    name: data.name,
    attributes: (() => {
      let property = [];
      data.attributes.forEach((attr) => {
        if (attr.is_timestamp) {
          attr.value = new Date(Number(attr.value)*1000)
            .toISOString().split('T')[0];
        };
        property.push({
          name: attr.name,
          value: attr.value
        });
      });
      return property;
    })(),
    tier_variations: (() => {
      let tiers = [];
      data.tier_variations.forEach((kind) => {
        tiers.push({
          name: kind.name,
          options: kind.options,
          images: kind.images != null
            ? (() => {
              var imgs = [];
              kind.images.forEach((img) => {
                imgs.push("https://cf.shopee.co.id/file/" + img)
              });
              return imgs;
            })()
            : kind.images
        });
      });
      return tiers;
    })(),
    models: (() => {
      let variations = [];
      data.models.forEach((item) => {
        variations.push({
          name: item.name,
          in_stock: item.stock != null ? Boolean(item.stock) : item.stock,
          tier_index: item.extinfo.tier_index,
          promotionid: item.promotionid,
          has_promo_reserved_stock: item.current_promotion_reserved_stock != null
            ? Boolean(item.current_promotion_reserved_stock)
            : item.current_promotion_reserved_stock
        });
      });
      return variations;
    })(),
    categories: {
      catids: parseCategory(data, "categories", "catid"),
      catnames: parseCategory(data, "categories", "display_name")
    },
    fe_categories: {
      catids: parseCategory(data, "fe_categories", "catid"),
      catnames: parseCategory(data, "fe_categories", "display_name")
    },
    item_rating: data.item_rating,
    item_rating: (() => {
      var sumcount = 0;
      data.item_rating.rating_count.forEach((num, index) => {
        sumcount += num * index
      });
      data.item_rating.rating_star = sumcount/data.item_rating.rating_count[0];
      return data.item_rating;
    })(),
    in_stock: data.stock != null ? Boolean(data.stock) : data.stock,
    in_stock_discount: data.discount_stock != null
      ? Boolean(data.discount_stock)
      : data.discount_stock,
    is_sold: data.historical_sold != null
      ? Boolean(data.historical_sold)
      : data.historical_sold,
    images: (() => {
      var imgs = [];
      data.images.forEach((img) => {
        imgs.push("https://cf.shopee.co.id/file/" + img);
      });
      return imgs;
    })(),
    has_video: Boolean(data.video_info_list.length),
    videos: (() => {
      let videos = [];
      if (data.video_info_list.length) {
        data.video_info_list.forEach((item) => {
          videos.push(item.default_format);
        });
        return videos;
      }
      else {
        return videos;
      }
    })(),
  };
  // dev mode
  // console.log("data.tier_variations:");
  // data.tier_variations.forEach((item) => { console.log(item.name)} );
  // end dev mode
  return product;
}

const getShopeeProductDetail = async(url) => {
  console.log("GET %s", url);
  const instance = await shopeeInstance();
  const response = await getProductDetail(instance, url);
  if (response.error == null) {
    return parseProductDetail(response.data);
  } else {
    return response;
  };
}

export { getShopeeProductDetail };