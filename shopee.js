import axios from 'axios';
import * as utils from './utils.js';

const DEFAULT_USER_AGENT = 'Best Deals for Affiliate';
const PRETEND_TO_BE_A_BROWSER = 'Mozilla/5.0 (X11; Linux x86_64) '
  + 'AppleWebKit/537.36 (KHTML, like Gecko) '
  + 'Chrome/110.0.0.0 Safari/537.36';
const IMAGE_PATH = 'https://cf.shopee.co.id/file/';

const endpoint = 'https://shopee.co.id/api/v4/flash_sale';

const instance = axios.create({
  baseURL: 'https://shopee.co.id/api/v4',
  timeout: 10000,
  headers: {
    'user-agent': DEFAULT_USER_AGENT,
    'content-type': 'application/json'
  },
});

async function get_promotion() {
  const url = endpoint + '/get_all_sessions?category_personalization_type=0';
  return await instance.get(url)
    .then(({ data }) => {
      const sessions = data.data.sessions;
      let result = [];
      sessions.forEach((session_item) => {
        result.push({
          promotionid: session_item.promotionid,
          name: session_item.name,
          url: `${endpoint}/get_all_itemids`.addQuery({
            need_personalize: true,
            order_mode: 2,
            promotionid: session_item.promotionid,
            sort_soldout: true
          })
        })
      });
      return { 'error': false, 'data': result };
    })
    .catch((error) => {
      return { 'error': true, 'message': error.message };
    });
}

async function get_product_id(promotion_url, flash_catid) {
  return await instance.get(promotion_url)
    .then(async({ data }) => {
      const item_list = await data.data.item_brief_list;
      let items = [];
      for (let item of item_list) {
        if (item.catid == flash_catid && !item.is_soldout) {
          items.push(item.itemid);
        };
      };
      return { 'error': false, 'data': items };
    })
    .catch((error) => {
      return { 'error': true, 'data': null, 'message': error.message };
    })
}

async function get_product(promotionid, itemids) {
  var limit = 16; // web default 16
  var itemCount = 0;
  var batchCount = Math.ceil(itemids.length / limit);
  let result = [];
  for (let batch = 0; batch < batchCount; batch++) {
    var start = batch * limit;
    var end = limit + itemCount;
    var options = {
      categoryid: 0,
      itemids: itemids.slice(start, end),
      limit: end,
      promotionid: promotionid,
      with_dp_items: true
    };
    var items = await (async function() {
      var url = endpoint + '/flash_sale_batch_get_items';
      return await instance.post(url, options)
        .then(({ data }) => {
          // console.log('Get flashsale page %s', batch + 1);
          return { 'error': false, 'data': data.data.items };
        })
        .catch((error) => {
          // console.info('Error in page %s: %s', batch + 1, error.message);
          return { 'error': true, 'message': error.message };
        });
    })();
    if (!items.error) {
      itemCount += items.data.length;
      result = result.concat(items.data);
    };
  };
  return result;
}

export async function get_flash_catid() {
  const url = endpoint + '/get_all_sessions?category_personalization_type=0';
  return await instance.get(url)
    .then(({ data }) => {
      const items = data.data.sessions[0].categories;
      let categories = [];
      items.forEach((item) => {
        categories.push({
          flash_catid: item.catid,
          catname: item.catname
        });
      });
      return { 'error': false, 'data': categories };
    })
    .catch((error) => {
      return { 'error': true, 'message': error.message };
    })
}

export async function get_flashsale(flash_catid) {
  const parse = (item) => {
    return {
      shopid: item.shopid,
      itemid: item.itemid,
      name: item.name,
      saving_percentage: item.raw_discount,
      price_before_discount: item.price_before_discount/100000,
      price: item.price/100000,
      item_rating: item.item_rating,
      categories: item.cats,
      stock: item.stock,
      image: IMAGE_PATH + item.image,
      url: `https://shopee.co.id/product/${item.shopid}/${item.itemid}`,
      is_flashsale: true,
      flashsale: {
        promotionid: item.promotionid,
        fs_catid: item.flash_catid,
        fs_start_time: item.start_time,
        fs_end_time: item.end_time,
        fs_stock: item.flash_sale_stock,
      },
      is_mart: item.is_mart,
      is_shop_official: item.is_shop_official,
    };
  };
  try {
    var promotion = await get_promotion().then(({ data }) => { return data });
    var product_ids = await get_product_id(promotion[0].url, flash_catid)
      .then(({ data }) => { return data });
    return await get_product(promotion.promotionid, product_ids)
      .then((products) => {
        products.forEach((item, i) => {
          products[i] = parse(item);
        });
        return products;
      });
  }
  catch(error) {
    return { 'error': true, 'message': error.message };
  };
}

async function get_category_tree() {
  var url = endpoint + '/pages/get_category_tree';
  var response = await instance.get(url)
    .then((response) => {
      console.log('Get category tree');
      return { 'error': false, 'data': response.data };
    })
    .catch((error) => {
      return { 'error': true, 'message': error.message };
    });
  const reshape = async(response) => {
    var catlist = await response.data.category_list;
    const parse = async(elem) => {
      return {
        catid: elem.catid,
        name: elem.name,
        parent_catid: elem.parent_catid,
        level: elem.level,
        children: elem.children
      }
    };
    var data = [];
    for (let elem of catlist) {
      var item = await parse(elem);
      if (item.children.length > 0) {
        var newchildren = [];
        item.children.forEach(async(elem) => {
          newchildren.push(await parse(elem));
        });
      };
      item.children = await newchildren;
      data.push(item);
    };
    return data;
  };
  if (!response.error) {
    return { 'error': false, 'data': await reshape(response) };
  } else {
    return response;
  };
}

function parse_shopee_url(url) {
  var re1 = /i(\.\d+){2}\/?$/;
  var re2 = /product(\/\d+){2}\/?$/;
  var url = url.split('?')[0];
  if (re1.test(url)) {
    var text = url.match(re1)[0];
  } else if (re2.test(url)) {
    var text = url.match(re2)[0];
  } else {
    return null
  }
  var match_text = [ ...text.matchAll(/\d+/g) ];
  var [ shopid, itemid ] = [ match_text[0][0], match_text[1][0]];
  return [ shopid, itemid ];
}

async function get_product_detail(instance, product_url) {
  const [ shopid, itemid ] = parse_shopee_url(product_url);
  const base = 'https://shopee.co.id/api/v4/item/get';
  const params = {
    itemid: itemid,
    shopid: shopid
  };
  const url = base.addQuery(params);
  instance.defaults.headers['user-agent'] = PRETEND_TO_BE_A_BROWSER;
  instance.defaults.headers['af-ac-enc-dat'] = null;
  return await instance.get(url)
    .then(async(response) => { return await response.data; })
    .catch((error) => { return { 'error': true, 'message': error.message }; });
}

function parse_product_detail(data) {
  const parse_category = (data, key, subkey) => {
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
                imgs.push(IMAGE_PATH + img)
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
      catids: parse_category(data, 'categories', 'catid'),
      catnames: parse_category(data, 'categories', 'display_name')
    },
    fe_categories: {
      catids: parse_category(data, 'fe_categories', 'catid'),
      catnames: parse_category(data, 'fe_categories', 'display_name')
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
        imgs.push(IMAGE_PATH + img);
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

export async function get_shopee_product_detail(url) {
  console.log('GET %s', url);
  const response = await get_product_detail(instance, url);
  if (response.error == null) {
    return parse_product_detail(response.data);
  } else {
    return response;
  };
}