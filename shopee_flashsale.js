import axios from "axios";

const USER_AGENT = "Best Deals for Affiliate";
const TIMEOUT = 10000; // in milliseconds

const shopeeInstance = async() => {
  return await axios.create({
    baseURL: "https://shopee.co.id/api/v4",
    timeout: TIMEOUT,
    headers: {
      "User-Agent": USER_AGENT,
      "Content-Type": "application/json"
    },
    // withCredentials: true
  });
}

const ShopeeFlashSale = {
  instance: (async() => { return await shopeeInstance() })(),
  getPromotion: async function getPromotion() {
    const url = "https://shopee.co.id/api/v4/flash_sale/get_all_sessions?category_personalization_type=0";
    return await this.instance.then(async(instance) => {
      return await instance.get(url).then(async({ data }) => {
        const sessions = await data.data.sessions;
        let result = [];
        for (let session of sessions) {
          const params = [
            "need_personalize=true",
            "order_mode=2",
            `promotionid=${session.promotionid}`,
            "sort_soldout=true"
          ].join('&');
          const url = "https://shopee.co.id/api/v4/flash_sale/get_all_itemids?" + params;
          result.push({
            promotionid: session.promotionid,
            name: session.name,
            url: url
          })
        };
        return result;
      })
      .catch((error) => {
        console.error(error);
        return { "error": true, "message": error }
      });
    })
  },
  getItem: async function getItem(promotionUrl, flash_catid) {
    return await this.instance.then(async(instance) => {
      return await instance.get(promotionUrl)
        .then(async({ data }) => {
          const itemList = await data.data.item_brief_list;
          let availableItem = [];
          for (let item of itemList) {
            if (item.catid == flash_catid && !item.is_soldout) {
              availableItem.push(item.itemid);
            };
          };
          return availableItem;
        })
        .catch((error) => {
          console.error(error);
          return []
        })
    })
  },
  getCategory: async function getCategory(session) {
    const url = "https://shopee.co.id/api/v4/flash_sale/get_all_sessions?category_personalization_type=0";
    return await this.instance.then(async(instance) => {
      return await instance.get(url)
        .then(async({ data }) => {
          const items = await data.data.sessions[session].categories;
          let categories = [];
          for (let item of items) {
            categories.push({
              flash_catid: item.catid,
              catname: item.catname
            });
          };
          return categories
        })
        .catch((error) => {
          console.error(error);
          return
        })
    })
  },
  getFlashSale: async function getFlashSale(promotionid, itemids) {
    var limit = 16;
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
      var items = await this.instance.then(async(instance) => {
        var url = "https://shopee.co.id/api/v4/flash_sale/flash_sale_batch_get_items";
        return await instance
          .post(url, options)
          .then(({ data }) => {
            console.log("POST %s (%s)", url, batch+1);
            return data.data.items;
          })
          .catch((error) => {
            console.error(error);
            return { "error": true, "message": error };
          });
        });
      if (items.error != true) {
        itemCount += items.length;
        result = result.concat(items);
      } else {
        result = items;
        break
      };
    };
    return result;
  }
}

export { ShopeeFlashSale };