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

const Shopee = {
  instance: (async() => { return await shopeeInstance() })(),
  getCategory: async function getCategory() {
    var url = "https://shopee.co.id/api/v4/pages/get_category_tree";
    var response = await this.instance.then(async(instance) => {
      return await instance.get(url)
        .then((response) => {
          console.log("GET %s", url);
          return response;
        })
        .catch((error) => {
          console.error(error);
          return { "error": true, "message": error };
        });
    });
    const reshape = async(response) => {
      var catlist = await response.data.data.category_list;
      var parse = async(elem) => {
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
    if (response.error != true) {
      return await reshape(response);
    } else {
      return response;
    };
  }
}

export { Shopee };