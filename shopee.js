import axios from 'axios';
import * as utils from './utils.js';

const DEFAULT_USER_AGENT = 'Best Deals for Affiliate';
const BROWSER_USER_AGENT = 'Mozilla/5.0 (X11; Linux x86_64) '
  + 'AppleWebKit/537.36 (KHTML, like Gecko) '
  + 'Chrome/110.0.0.0 Safari/537.36';

const IMAGE_PATH = 'https://cf.shopee.co.id/file/';

const FLASH_ENDPOINT = 'https://shopee.co.id/api/v4/flash_sale/';

const DEFAULT_INSTANCE = axios.create({
  baseURL: 'https://shopee.co.id/api/v4',
  timeout: 10000,
  headers: {
    'user-agent': DEFAULT_USER_AGENT,
    'content-type': 'application/json'
  },
});

async function init_cookie(path) {
  const dummy_request_url = 'https://shopee.co.id/api/v4/pages/is_short_url/';
  const axiosInstance = axios.create({
    timeout: 5000,
    headers: {
      'user-agent': BROWSER_USER_AGENT,
      'content-type': 'application/json'
    },
  });
  axiosInstance.defaults.headers['cookie'] = await axiosInstance
    .get(dummy_request_url, { params: { path: path } })
    .then((response) => {
      return response.headers['set-cookie'].map((cookie) => {
        return cookie.split(';')[0];
      }).join('; ');
    })
    .catch((error) => {
      console.error('err: %s (ref dummy request)', error.message);
      return null;
    });
  return axiosInstance;
}

async function get_promotion() {
  const url = FLASH_ENDPOINT + 'get_all_sessions';
  return await DEFAULT_INSTANCE.get(url, { 
      params: {
        category_personalization_type: 0
      }
    })
    .then(({ data }) => {
      var promotions = data.data.sessions;
      promotions = promotions.map((session_item) => {
        return {
          promotionid: session_item.promotionid,
          name: session_item.name,
          url: `${FLASH_ENDPOINT}get_all_itemids`.addQuery({
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
  return await DEFAULT_INSTANCE.get(promotion_url)
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
  console.log('Get flashsale...');
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
      var url = FLASH_ENDPOINT + 'flash_sale_batch_get_items';
      return await DEFAULT_INSTANCE.post(url, options)
        .then(({ data }) => {
          // console.log('Get flashsale page %s', batch + 1);
          return { 'error': false, 'data': data.data.items };
        })
        .catch((error) => {
          // console.info('Error in page %s: %s', batch + 1, error.message);
          return { 'error': true, 'message': `${error.message} (ref ${url})` };
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
  const url = FLASH_ENDPOINT + 'get_all_sessions';
  return await DEFAULT_INSTANCE.get(url, {
      param: {
        category_personalization_type: 0
      }
    })
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
      return { 'error': true, 'message': `${error.message} (ref ${url})` };
    })
}

export async function get_shopee_flashsale(flash_catid) {
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

export async function get_category_tree() {
  var url = 'https://shopee.co.id/api/v4/pages/get_category_tree';
  const axiosInstance = await init_cookie('flash_sale');
  var response = await axiosInstance.get(url)
    .then((response) => {
      console.log('Get category tree...');
      return { 'error': false, 'data': response.data.data.category_list };
    })
    .catch((error) => {
      return { 'error': true, 'message': `${error.message} (ref ${url})` };
    });
  const reshape = async(response) => {
    var catlist = await response.data;
    const parse = (elem) => {
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
        item.children = await item.children.map((elem) => {
          return parse(elem);
        });
      };
      data.push(await item);
    };
    return data;
  };
  if (!response.error) {
    return { 'error': false, 'data': await reshape(response) };
  } else {
    return response;
  };
}

function parse_shopee_product_url(url) {
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

function parse_shopee_category_url(url) {
  var re1 = /cat(\.\d+){1,}$/;
  if (re1.test(url)) {
    var text = url.match(re1)[0].split('.');
  }
  var catids = text.filter((item) => {
    return item.match(/^\d+$/g)
  });
  return catids
}

async function get_product_detail(product_url) {
  const [ shopid, itemid ] = parse_shopee_product_url(product_url);
  const url = 'https://shopee.co.id/api/v4/item/get';
  return await axios.get(url,
    {
      params: {
        itemid: itemid,
        shopid: shopid
      },
      headers: {
        'content-type': 'application/json',
        'user-agent': BROWSER_USER_AGENT,
        'af-ac-enc-dat': null
      }
    })
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
    has_video: data.video_info_list != null
      ? Boolean(data.video_info_list.length)
      : false,
    videos: (() => {
      if (data.video_info_list != null) {
        if (data.video_info_list.length) {
          return data.video_info_list.map((item) => {
            return item.default_format;
          })
        };
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
  const response = await get_product_detail(url);
  if (response.error == null) {
    return parse_product_detail(response.data);
  } else {
    return response;
  };
}

async function get_shopid(username) {
  const url = 'https://shopee.co.id/api/v4/shop/get_shop_base';
  const axiosInstance = await init_cookie(username);
  const data = await axiosInstance.get(url, {
      params: { username: username }
    })
    .then(({ data }) => { return data.data.shopid; })
    .catch((error) => {
      console.error('err: %s (ref %s)', error.message, url);
      return null;
    });
  return data;
}

/*
  catalog_id can be available to retrieve by using cookie setup
  if catalog_id is not defined, all product should be collected
*/

export async function get_shopee_shop_product(shop, catalog_id) {
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
  var shop_id = Number(shop) ? shop : await get_shopid(shop);
  var domain = 'https://shopee.co.id/api/v4/recommend/recommend';
  var offset = 0;
  var limit = 120; // default web 30
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
    var data = await DEFAULT_INSTANCE.get(domain, { params: params })
      .then(({ data }) => {
        return { 'error': false, 'data': data.data.sections[0] };
      })
      .catch((error) => {
        return { 'error': true, 'message': `${error.message} (ref: ${domain})` }
      });
    if (!data.error) {
      offset += data.data.data.item.length;
      has_more = data.data.has_more;
      if (shop_name === undefined) {
        shop_name = data.data.data.item[0].shop_name;
        console.log('Get products from %s', shop_name);
      };
      products = products.concat(
        data.data.data.item.map((item) => {
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

export async function get_shopee_category_product(url, keyword) {
  console.log('GET %s\nKeyword: %s', url, keyword);
  const catids = await parse_shopee_category_url(url);
  const cat_level = catids.length;
  const cat_id = catids[cat_level - 1];
  const parse = (item) => {
    return {
      shopid: item.shopid,
      itemid: item.itemid,
      name: item.name,
      price: item.price/100000,
      price_before_discount: item.price_before_discount/100000,
      currency: item.currency,
      saving_percentage: item.raw_discount,
      item_rating: item.item_rating,
      // categories: item.cats,
      categories: item.catid,
      stock: item.stock,
      image: IMAGE_PATH + item.image,
      images: item.images.map((image) => {
        return IMAGE_PATH + image
      }),
      url: `https://shopee.co.id/product/${item.shopid}/${item.itemid}`,
      is_flashsale: item.is_on_flash_sale,
      flashsale: item.is_on_flash_sale 
        ? {
          promotionid: item.promotionid ? item.promotionid : null,
          flash_catid: item.flash_catid ? item.flash_catid : null,
          flash_start_time: item.start_time ? item.start_time : null,
          flash_end_time: item.end_time ? item.end_time : null,
          flash_stock: item.flash_sale_stock ? item.flash_sale_stock : null,
        }
        : null,
      is_shopee_mall: item.is_official_shop ? item.is_official_shop : null,
      is_shopee_food: item.is_shopee_food ? item.is_shopee_food : null,
      is_shopee_mart: item.is_mart ? item.is_mart : null,
    };
  };
  var domain = 'https://shopee.co.id/api/v4/recommend/recommend';
  var offset = 0;
  var limit = 120; // default web 60
  var has_more = true;
  let products = [];
  while (has_more) {
    var params = {
      bundle: 'category_landing_page',
      cat_level: cat_level != null ? cat_level : '',
      catid: cat_id != null ? cat_id : '',
      limit: limit,
      offset: offset
    };
    var data = await DEFAULT_INSTANCE.get(domain, { params: params })
      .then(({ data }) => {
        return { 'error': false, 'data': data.data.sections[0] };
      })
      .catch((error) => {
        return { 'error': true, 'message': `${error.message} (ref: ${domain})` }
      });
    if (!data.error) {
      offset += data.data.data.item.length;
      has_more = data.data.has_more;
      products = products.concat(
        data.data.data.item.map((item) => {
          return parse(item);
        })
      );
    } else {
      has_more = false;
      products = data;
    };
  };
  let results = []
  if (Boolean(products.length) & keyword != null) {
    if (typeof keyword == 'object' | typeof keyword == 'string' & keyword.length > 0) {
      for (let item of products) {
        var product_name = item.name.toLowerCase();
        if (typeof keyword == 'object') {
          if (keyword.filter((key) => {
            return product_name.search(key.toLowerCase()) != -1
          }).length) {
            results.push(item)
          };
        }
        if (typeof keyword == 'string') {
          if (product_name.search(keyword.toLowerCase()) != -1) {
            results.push(item)
          }
        }
      };
    } else {
      results = results.concat(products);
    };
  } else {
    results = results.concat(products);
  }
  console.log('Items count: %s', results.length);
  return results
}