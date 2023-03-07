import axios from "axios";

const USER_AGENT = "Please hire me";
const TIMEOUT = 30000; // in milliseconds

export async function shopeeInstance() {
  const cookie = false;
  const initUrl = "https://shopee.co.id/api/v4/pages/is_short_url/?path=flash_sale";
  var instance = await axios.create(
    {
      baseURL: "https://shopee.co.id/api/v4",
      headers: {
        "User-Agent": USER_AGENT,
        "Content-Type": "application/json"
      },
      timeout: TIMEOUT,
      // withCredentials: true
    }
  );
  if (cookie) {
    await instance.get(initUrl)
      .then((response) => {
        instance.defaults.headers['cookie'] = response.headers["set-cookie"];
      });
  };
  return instance;
}

export async function getPromotionId(instance) {
  const url = "https://shopee.co.id/api/v4/flash_sale/get_all_sessions?category_personalization_type=0";
  return await instance.get(url)
    .then(({ data }) => {
      const sessions = data.data.sessions;
      let result = { data: [] };
      for (let session of sessions) {
        const params = [
          "need_personalize=true",
          "order_mode=2",
          `promotionid=${session.promotionid}`,
          "sort_soldout=true"
        ].join('&');
        const url = "https://shopee.co.id/api/v4/flash_sale/get_all_itemids?" + params;
        result.data.push({
          promotionid: session.promotionid,
          name: session.name,
          url: url
        })
      };
      return result;
    })
    .catch((error) => { console.log(error); });
}

export async function getItemId(instance, promotionUrl, catid) {
  return await instance.get(promotionUrl).then(({ data }) => {
    const itemList = data.data.item_brief_list;
    let availableItem = [];
    for (let item of itemList) {
      if (item.catid == catid && !item.is_soldout) {
        availableItem.push(item.itemid);
      };
    };
    return availableItem;
  }).catch((error) => {
    console.log(error);
    return []
  })
}

export async function getFlashSale(instance, promotionid, itemids) {
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
    var items = await instance.post("https://shopee.co.id/api/v4/flash_sale/flash_sale_batch_get_items", options)
      .then(({ data }) => {
        return data.data.items;
      })
      .catch((error) => { console.log(error) });
    itemCount += items.length;
    result = result.concat(items);
  };
  return result;
}
