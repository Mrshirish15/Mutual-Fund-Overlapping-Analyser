const express = require("express");
const app = express();
const ejs = require("ejs");
const path = require("path");
const bodyParser = require("body-parser");
const port = 9000;
const mongoose = require("mongoose");
const {
  log
} = require("console");

//middleware
app.use(express.json());
app.set("views", path.join(__dirname, "views"));
app.use(express.static(__dirname + '/public'));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({
  extended: true
}));
// mongoDB connextion

let db = "mongodb+srv://rajshirish36481:Lol2023@cluster0.3gqfvxo.mongodb.net/Fund?retryWrites=true&w=majority";

mongoose.connect(db, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const MutualDatas = mongoose.Schema({
  MutualFund: {
    type: String,
    required: true,
  },

  Details: [{
    first: {
      type: String,
      required: true
    },
    second: {
      type: Number,
      required: true
    },
    third: {
      type: String,
      required: true
    },
  },],
});

const dataModel2 = mongoose.model("dataModel2", MutualDatas);
// routes

app.get('/home',(req,res)=>{
  res.render("home")
})

app.get("/post-data", (req, res) => {
  res.render("input-data");
});

app.post("/post-data", async (req, res) => {
  console.log(req.body);
  let obj = req.body;
  let newData = await dataModel2.create(obj);
  console.log(newData);

  res.send("posted");
});

app.get("/compare-tool", (req, res) => {
  dataModel2
    .find()
    .then((result) => {
      res.render("compare", {
        data: result
      });
    })
    .catch((err) => {
      console.log(err);
    });
});

let fund2_sectors_2_copy;
let fund1_sectors_1_copy;
let scheme2;

app.post("/result", (req, res) => {
  let obj1, obj2, percent;
  let fund1_sectors = {};
  let fund2_sectors = {};

  obj1 = req.body.first;
  obj2 = req.body.second;
  console.log(obj1, obj2);

  field1 = obj1;
  field2 = obj2;
  scheme2 = obj2;

  let fund1, fund2;
  dataModel2
    .findOne({
      MutualFund: obj1
    }, {
      Details: 1
    })
    .then((document1) => {
      if (document1) {
        fund1 = document1.Details;

        // sum of sectors

        for (let i = 0; i < fund1.length; i++) {
          const a = fund1[i].third;
          fund1_sectors[a] = (fund1_sectors[a] || 0) + fund1[i].second;
        }

        fund1_sectors_1_copy = fund1_sectors;

        const sorted1 = Object.entries(fund1_sectors)
          .sort((a, b) => b[1] - a[1])
          .reduce((obj, [key, value]) => {
            obj[key] = value;
            return obj;
          }, {});

        // Find the second array
        dataModel2
          .findOne({
            MutualFund: obj2
          }, {
            Details: 1
          })
          .then((document2) => {
            if (document2) {
              fund2 = document2.Details;
              for (let i = 0; i < fund2.length; i++) {
                const a = fund2[i].third;
                fund2_sectors[a] = (fund2_sectors[a] || 0) + fund2[i].second;
              }

              fund2_sectors_2_copy = fund2_sectors;

              const sorted2 = Object.entries(fund2_sectors)
                .sort((a, b) => b[1] - a[1])
                .reduce((obj, [key, value]) => {
                  obj[key] = value;
                  return obj;
                }, {});

              console.log("sorted1", sorted1, "sorted2", sorted2);

              // Find the intersection of the two arrays and the corresponding values
              const intersection = fund1
                .filter((item1) => {
                  const found = fund2.find(
                    (item2) => item2.first === item1.first
                  );
                  return found;
                })
                .map((item1) => {
                  const item2 = fund2.find(
                    (item2) => item2.first === item1.first
                  );
                  return {
                    name: item1.first,
                    value1: item1.second,
                    value2: item2.second,
                  };
                });
              console.log("intersection", intersection);
              let a = intersection.length;
              let b = fund1.length;
              let c = fund2.length;
              percent = (a / ((b - a) + (c - a) + a)) * 100;
              return res.render("comparedResult", {
                intersection,
                a,
                b,
                c,
                obj1,
                obj2,
                percent,
                sorted1,
                sorted2,
              });
            } else {
              console.log("No document found for second query");
            }
          })
          .catch((error2) => {
            console.log(`Error occurred in second query: ${error2}`);
          });
      } else {
        console.log("No document found for first query");
      }
    })
    .catch((error1) => {
      console.log(`Error occurred in first query: ${error1}`);
    });
});

app.get("/portfolio/:id", (req, res) => {
  try {
    dataModel2.findById(req.params.id).then((result) => {
      res.render("port", {
        data: result
      });
    });
  } catch (err) {
    res.status(500).json();
  }
});

app.get("/suggetion", async (req, res) => {
  let data = await dataModel2.find();
  let SectorWiseArray = [];

  for (let i = 0; i < data.length; i++) {
    let arr = data[i].Details;
    const result = Object.entries(
      arr.reduce((acc, {
        first,
        second,
        third
      }) => {
        acc[third] = (acc[third] || 0) + second;
        return acc;
      }, {})
    ).sort((a, b) => b[1] - a[1]);

    SectorWiseArray.push(result);
  }

  let Top50Sectors = [];

  for (let i = 0; i < SectorWiseArray.length; i++) {
    let sum = 0;
    let j = 0;
    let temp = [];
    while (j < SectorWiseArray[i].length && sum < 50) {
      sum += SectorWiseArray[i][j][1];
      temp.push(SectorWiseArray[i][j]);
      j++;
    }

    Top50Sectors.push(temp);
  }

  let {
    CommonMutualFund1,
    NumberOfCommonStocks1
  } = await operation1(
    Top50Sectors,
    fund2_sectors_2_copy
  );
  let {
    CommonMutualFund2,
    NumberOfCommonStocks2
  } = await operation2(
    Top50Sectors,
    fund1_sectors_1_copy
  );
  res.render("suggest", {
    CommonMutualFund1,
    NumberOfCommonStocks1,
    CommonMutualFund2,
    NumberOfCommonStocks2,
    scheme2
  });
});

async function operation1(Top50Sectors, fund2_sectors_2_copy) {
  console.log("top50Sectors", Top50Sectors);
  let NumberOfCommonStocks1 = 0;

// we will compare each schemes top 50% sectors with the each fund2_secotors and store the common sectors, in this way we will get the 
// common top 50%  sectors of each scheme the fund2 scheme.

  const result = Top50Sectors.map((subArr) => {
    const obj = {};
    subArr.forEach(([str, num]) => {
      for (let key in fund2_sectors_2_copy) {
        if (str.toLowerCase().includes(key.toLowerCase())) {
          if (!obj[key]) {
            obj[key] = [];
          }
          obj[key].push([str, num]);
        }
      }
    });
    return obj;
  });

  console.log("sectors2", fund2_sectors_2_copy);
  console.log("common", result);

  // count array will just store the common sectors for each schemes with fund2 scheme under 50% holding.

  const counts = result.map((obj) => {
    const keys = Object.keys(obj);
    return keys.length;
  });

  let database = await dataModel2.find();
  let CommonMutualFund1 = [];
  for (let i = 0; i < Top50Sectors.length; i++) {
    console.log("a1 ", Top50Sectors[i].length, "b1 ", counts[i]);
    if (counts[i] / Top50Sectors[i].length <= 0.5) {
      CommonMutualFund1.push({
        a: database[i].MutualFund,
        b: Top50Sectors[i]
      });
      NumberOfCommonStocks1++;
    }
  }
  // console.log(CommonMutualFund1);
  return {
    CommonMutualFund1,
    NumberOfCommonStocks1
  };
}

async function operation2(Top50Sectors, fund1_sectors_1_copy) {
  let NumberOfCommonStocks2 = 0;

  const result = Top50Sectors.map((subArr) => {
    const obj = {};
    subArr.forEach(([str, num]) => {
      for (let key in fund1_sectors_1_copy) {
        if (str.toLowerCase().includes(key.toLowerCase())) {
          if (!obj[key]) {
            obj[key] = [];
          }
          obj[key].push([str, num]);
        }
      }
    });
    return obj;
  });

  const counts = result.map((obj) => {
    const keys = Object.keys(obj);
    return keys.length;
  });

  let database = await dataModel2.find();
  let CommonMutualFund2 = [];
  for (let i = 0; i < Top50Sectors.length; i++) {
    console.log("a ", Top50Sectors[i].length, "b ", counts[i]);
    if (counts[i] / Top50Sectors[i].length <= 0.5) {
      CommonMutualFund2.push({
        a: database[i].MutualFund,
        b: Top50Sectors[i]
      });
      NumberOfCommonStocks2++;
    }
  }
  // console.log(CommonMutualFund2);
  return {
    CommonMutualFund2,
    NumberOfCommonStocks2
  };
}

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});