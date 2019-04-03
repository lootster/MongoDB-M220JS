const MongoClient = require("mongodb").MongoClient
const ObjectId = require("mongodb").ObjectId
const MongoError = require("mongodb").MongoError

// This syntax is called an Immediately Invoked Function Executioin (IIFE)
// It's useful for proper scoping, and in this case allowing us to use
// async/await syntax

;(async () => {
  try {
    const host = "mongodb://localhost:27017"
    const client = await MongoClient.connect(
      host,
      { useNewUrlParser: true },
    )
    const mflix = client.db("mflix")

    const predicate = { lastupdated: { $exists: true, $type: "string" } }
    // we use the projection here to only return the _id and lastupdated fields
    const projection = { lastupdated: 1 }

    const cursor = await mflix
      .collection("movies")
      .find(predicate, projection)
      .toArray()
    const moviesToMigrate = cursor.map(({ _id, lastupdated }) => ({
      updateOne: {
        filter: { _id: ObjectId(_id) },
        update: {
          $set: { lastupdated: Date.parse(lastupdated) },
        },
      },
    }))
    // What's the strange "\x1b[32m"? It's coloring. 31 is red, 32 is green
    console.log(
      "\x1b[32m",
      `Found ${moviesToMigrate.length} documents to update`,
    )
    // Here's where we dispatch the bulk update. We destructure the
    // modifiedCount key out of the result

    const { modifiedCount } = await mflix
      .collection("movies")
      .bulkWrite(moviesToMigrate)

    console.log("\x1b[32m", `${modifiedCount} documents updated`)
    client.close()
    process.exit(0)
  } catch (e) {
    // check to see if the error was a MongoError and specifically a
    // Invalid Operation error, meaning no documents to update
    if (
      e instanceof MongoError &&
      e.message.slice(0, "Invalid Operation".length) === "Invalid Operation"
    ) {
      console.log("\x1b[32m", "No documents to update")
    } else {
      console.error("\x1b[31m", `Error during migration, ${e}`)
    }
    process.exit(1)
  }
})()