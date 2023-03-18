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
      var promotions = data.data.sessions;
      promotions = promotions.map((session_item) => {
        return {
          promotionid: session_item.promotionid,
          name: session_item.name,
          url: `${endpoint}/get_all_itemids`.addQuery({
            need_personalize: true,
            order_mode: 2,
            promotionid: session_item.promotionid,
            sort_soldout: true
          })
        };
      });
      return { 'error': false, 'data': promotions };
    })
    .catch((error) => {
      return { 'error': true, 'message': error.message };
    });
}

async function get_product_id(promotion_url, flash_catid) {
  return await instance.get(promotion_url)
    .then(async({ data }) => {
      let items = [];
      for (let item of await data.data.item_brief_list) {
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
      var categories = data.data.sessions[0].categories;
      categories = categories.map((item) => {
        return {
          flash_catid: item.catid,
          catname: item.catname
        };
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
      price: item.price/100000,
      price_before_discount: item.price_before_discount/100000,
      saving_percentage: item.raw_discount,
      item_rating: item.item_rating,
      categories: item.cats,
      stock: item.stock,
      image: IMAGE_PATH + item.image,
      url: `https://shopee.co.id/product/${item.shopid}/${item.itemid}`,
      is_flashsale: true,
      flashsale: {
        promotionid: item.promotionid,
        flash_catid: item.flash_catid,
        flash_start_time: item.start_time,
        flash_end_time: item.end_time,
        flash_stock: item.flash_sale_stock,
      },
      is_shopee_mall: item.is_shop_official,
      is_shopee_food: item.is_shopee_food,
      is_shopee_mart: item.is_mart,
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
        item.children = item.children.map(async(elem) => {
          return await parse(elem);
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
  const url = 'https://shopee.co.id/api/v4/item/get';
  const params = {
    itemid: itemid,
    shopid: shopid
  };
  instance.defaults.headers['user-agent'] = PRETEND_TO_BE_A_BROWSER;
  instance.defaults.headers['af-ac-enc-dat'] = null;
  return await instance.get(url.addQuery(params))
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
      return data.attributes.map((attr) => {
        if (attr.is_timestamp) {
          attr.value = new Date(Number(attr.value)*1000)
            .toISOString().split('T')[0];
        };
        return {
          name: attr.name,
          value: attr.value
        };
      });
    })(),
    tier_variations: (() => {
      return data.tier_variations.map((kind) => {
        return {
          name: kind.name,
          options: kind.options,
          images: kind.images != null
            ? (() => {
              return kind.images.map((img) => {
                return IMAGE_PATH + img;
              });
            })()
            : kind.images
        };
      });
    })(),
    models: (() => {
      return data.models.map((item) => {
        return {
          name: item.name,
          in_stock: item.stock != null ? Boolean(item.stock) : item.stock,
          tier_index: item.extinfo.tier_index,
          promotionid: item.promotionid,
          has_promo_reserved_stock: item.current_promotion_reserved_stock != null
            ? Boolean(item.current_promotion_reserved_stock)
            : item.current_promotion_reserved_stock
        };
      });
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
      return data.images.map((img) => {
        return IMAGE_PATH + img;
      });
    })(),
    has_video: Boolean(data.video_info_list.length),
    videos: (() => {
      if (data.video_info_list.length) {
        return data.video_info_list.map((item) => {
          return item.default_format;
        });
      }
      else {
        return [];
      }
    })(),
    url: `https://shopee.co.id/product/${data.shopid}/${data.itemid}`,
  };
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

/*
  catalog_id can be available to retrieve by using cookie setup
  if catalog_id is not defined, all product should be collected
*/

export async function get_shopee_shop_product(shop_id, catalog_id) {
  const parse = (item) => {
    return {
      shopid: item.shopid,
      itemid: item.itemid,
      name: item.name,
      shop_name: item.shop_name,
      brand: item.brand,
      tier_variations: item.tier_variations.map((tier) => {
        return {
          name: tier.name,
          options: tier.options,
          images: tier.images != null
            ? tier.images.map((img) => { return IMAGE_PATH + img; })
            : tier.images
        };
      }),
      currency: item.currency,
      price: item.price/100000,
      price_min: item.price_min/100000,
      price_max: item.price_max/100000,
      price_before_discount: item.price_before_discount/100000,
      price_min_before_discount: item.price_min_before_discount/100000,
      price_max_before_discount: item.price_max_before_discount/100000,
      saving_percentage: item.raw_discount,
      is_on_flash_sale: item.is_on_flash_sale,
      flash_sale_stock: item.flash_sale_stock,
      stock: item.stock,
      recent_sell: item.sold,
      sold: item.historical_sold,
      liked_count: item.liked_count,
      comment_count: item.cmt_count,
      item_rating: item.item_rating,
      images: item.images.map((img) => {
        return IMAGE_PATH + img;
      }),
      shop_location: item.shop_location,
      shop_rating: item.shop_rating,
      is_shopee_mall: item.is_official_shop,
      is_shopee_verified: item.shopee_verified,
      is_shopee_mart: item.is_mart,
      url: `https://shopee.co.id/product/${item.shopid}/${item.itemid}`,
    }
  };
  var domain = 'https://shopee.co.id/api/v4/recommend/recommend';
  var offset = 0;
  var limit = 150; // default web 30
  var has_more = true;
  let products = [];
  let shop_name;
  while (has_more) {
    var params = {
      bundle: 'shop_page_category_tab_main',
      catid: catalog_id != null ? catalog_id : '',
      item_card: 2,
      limit: limit,
      offset: offset,
      section: 'shop_page_category_tab_main_sec',
      shopid: shop_id,
      sort_type: 1,
      tab_name: 'popular',
      upstream: ''
    };
    var url = domain.addQuery(params);
    var data = await instance.get(url)
      .then(({ data }) => {
        return { 'error': false, 'data': data.data.sections[0].data };
      })
      .catch((error) => {
        return { 'error': true, 'message': error.message }
      });
    if (!data.error) {
      offset += data.data.item.length;
      has_more = data.has_more;
      if (shop_name === undefined) {
        shop_name = data.data.item[0].shop_name;
        console.log('Get products from %s', shop_name);
      };
      products = products.concat(
        data.data.item.map((item) => {
          return parse(item);
        })
      );
    } else {
      has_more = false;
      products = data;
    };
  };
  if (products.length) console.log('Items count: %s', products.length);
  return products;
}