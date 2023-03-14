import axios from "axios";
import * as fs from "fs";
import * as utils from "./utils.js";


const USER_AGENT = "Best Deals for Affiliate";
const PRETEND_TO_BE_A_BROWSER = 'Mozilla/5.0 (X11; Linux x86_64) '
  + 'AppleWebKit/537.36 (KHTML, like Gecko) '
  + 'Chrome/110.0.0.0 Safari/537.36';
const TIMEOUT = 10000; // in milliseconds

const zaloraInstance = async() => {
  return await axios.create({
    baseURL: "https://www.zalora.co.id",
    timeout: TIMEOUT,
    headers: {
      "User-Agent": USER_AGENT,
      "Content-Type": "application/json"
    }
  });
}

const Zalora = {
  name: "Zalora",
  baseUrl: "https://www.zalora.co.id",
  instance: (async() => { return await zaloraInstance() })(),
  parseUrl: function parseUrl(url) {
    var [ url, params ] = url.split("?");
    if (params) {
      var params = params.split("&");
      var params = (() => {
        let items = {};
        params.forEach((param) => {
          var [ key, value ] = param.split("=");
          if (key == "category_id") {
            if (value.match("--")) var value = value.replaceAll("--", ",");
            Object.assign(items, { [key]: value });
          };
        });
        return items;
      })();
    };
    var url = url.replace(this.baseUrl, "");
    var arr = url.split("/").filter((item) => { return item != "" });
    const getCategoryId = (data) => {
      if (typeof data.category_id != "string") {
        var categories = this.categories();
        categories = categories.filter((item) => {
          return item.category_url == data.url;
        });
        if (categories.length == 1) {
          data = Object.assign(data, {
            category_id: String(categories[0].category_id)
          });
        };
      };
      return data;
    }
    if (arr[0] == "outlet" && arr.length >= 3) {
      var data = Object.assign({
        url: `/${arr.slice(1, arr.length).join("/")}`,
        segment: arr[1],
        catalogtype: arr[0].toTitleCase(),
      }, params ? { ...params } : {});
      data = getCategoryId(data);
      return data;
    } else if (arr[0] != "outlet" && arr.length >= 2) {
      var data = Object.assign({
        url: `/${arr.join("/")}`,
        segment: arr[0],
        catalogtype: "Main",
      }, params ? { ...params } : {});
      data = getCategoryId(data);
      return data;
    } else {
      return { "error": true, "message": "Link do not meet criteria" };
    };
  },
  categories: function () {
    return JSON.parse(fs.readFileSync("./zalora_categories.json"));
  },
  getProduct: async function getProduct(url, npage) {
    const parse = (data) => {
      var products = [];
      data.forEach((item) => {
        products.push({
          sku: item.meta.sku,
          name: item.meta.name,
          brand: item.meta.brand,
          special_price: Number(item.meta.special_price
            .replace("Rp", "").replaceAll(".", "").trim()),
          price: Number(item.meta.price
            .replace("Rp", "").replaceAll(".", "").trim()),
          saving_percentage: Number(item.saving),
          is_znow: item.is_znow_sku,
          gender: item.meta.gender,
          link: this.baseUrl + "/" + item.link,
          images: (() => {
            let imgs = [];
            item.images.forEach((img) => {
              imgs.push(img.url);
            });
            return imgs;
          })(),
          models: (() => {
            var variations = [];
            Object.keys(item.simples).forEach((key, index) => {
              var value = item.simples[key];
              value.meta.size = value.meta.size == ""
                ? value.attributes.size
                : value.meta.size
              variations.push({
                sku: value.meta.sku,
                stock: Number(value.meta.quantity),
                size: value.meta.size,
                size_position: Number(value.meta.size_position),
                special_price: Number(value.meta.special_price),
                price: Number(value.meta.price),
                saving_percentage: Number(value.meta.saving_percentage),
                shipment_type: value.meta.shipment_type
              });
            });
            return variations;
          })(),
          size_system: item.meta.sizesystembrand,
          size_available: (() => {
            let sizes = [];
            item.available_sizes.forEach((size) => {
              sizes.push(size.label);
            });
            return sizes;
          })(),
          attributes: item.attributes,
          categories: {
            id: item.meta.categories.split("|"),
            breadcrumb: item.bread_crumb.split(">")
          },
          reviews: item.review_statistics,
          description: item.meta.short_description
        });
      });
      return products;
    };
    const path = "https://www.zalora.co.id/_c/v1/rr/desktop/list_catalog_products";
    const formula = "sum("
      + "product(0.05,score_simple_availability),"
      + "product(0.0,score_novelty),"
      + "product(0.9,score_product_boost),"
      + "product(0.0,score_random),"
      + "product(1.0,score_personalization))";
    var offset = 0;
    var limit = 27; // default 27 items per page
    var result = [];
    var itemCount = result.length;
    var urlParam = await this.parseUrl(url);
    for (let page = 0; page < npage; page++) {
      const params = {
        url: urlParam.endpoint, // "/women/all-products",
        sort: "popularity",
        dir: "desc",
        offset: offset,
        limit: limit,
        category_id: urlParam.category_id,
        gender: urlParam.segment, // "women",
        segment: urlParam.segment, // "women",
        special_price: false,
        all_products: false,
        new_products: false,
        top_sellers: false,
        catalogtype: urlParam.catalogtype, // "Outlet",
        lang: "id",
        is_brunei: false,
        sort_formula: formula,
        search_suggest: false,
        enable_visual_sort: true,
        enable_filter_ads: true,
        compact_catalog_desktop: false,
        name_search: false,
        solr7_support: false,
        pick_for_you: false,
        learn_to_sort_catalog: false,
        enable_similar_term: true,
        enable_relevance_classifier: true,
        auto_correct: true
      };
      var link = path.addQuery(params);
      var response = await this.instance.then(async(instance) => {
        return await instance.get(link).then(({ data }) => { return data })
          .catch((error) => {
            // console.error(error);
            return { "error": true, "page": page+1, "message": error.message };
          });
      });
      if (!response.error) {
        var data = parse(response.response.docs);
        var result = result.concat(data);
        offset += limit;
        itemCount += data.length;
        if (itemCount >= response.response.numFound) {
          break
        };
      } else {
        return response;
      };
    };
    return result;
  },
}

export { Zalora };