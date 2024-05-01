const fs = require('fs')
const Papa = require('papaparse')
const { stringify } = require('csv-stringify');

generate()

async function generate() {
  console.log('generate')

  // Iterate every quarter from Q4 2023 until now
  const quarterEndDate = new Date('2023-12-31T00:00:00Z')
  console.debug('quarterEndDate:', quarterEndDate)
  const nowDate = new Date()
  console.debug('nowDate:', nowDate)
  while (nowDate.getTime() > quarterEndDate.getTime()) {
    const quarterBeginDate = new Date(quarterEndDate.getTime() - 13*7*24*60*60*1000)
    console.info('quarter:', `[${quarterBeginDate.toISOString()} → ${quarterEndDate.toISOString()}]`)

    let rewardsQuarterly = {}
    
    // Iterate weekly CSVs within each quarter
    const weekEndDate = quarterBeginDate
    while (quarterEndDate.getTime() > weekEndDate.getTime()) {
      console.log('weekEndDate:', weekEndDate)

      // Load the weekly CSV
      const contributionsFilePath = `weekly/${weekEndDate.toISOString().substring(0, 10)}_rewards.csv`
      // console.log('contributionsFilePath:', contributionsFilePath)
      let contributionsDataWeekly = []
      if (!fs.existsSync(contributionsFilePath)) {
        console.error('File does not exist')
      } else {
        contributionsDataWeekly = await loadCSVData(contributionsFilePath)
      }
      // console.log('contributionsDataWeekly:', contributionsDataWeekly)

      if (contributionsDataWeekly) {
        // Summarize quarterly hours spent for each citizen
        contributionsDataWeekly.forEach((dataRow) => {
          console.log('dataRow:', dataRow)
          if (dataRow.passport_id) {
            if (rewardsQuarterly[String(dataRow.passport_id)] == undefined) {
              const reward = {
                passport_id: Number(dataRow.passport_id),
                profile_id: Number(dataRow.profile_id),
                hours_spent_total: Number(dataRow.hours_spent_total),
                reward_nation: Number(dataRow.reward_nation)
              }
              rewardsQuarterly[String(dataRow.passport_id)] = reward
            } else {
              const reward = rewardsQuarterly[String(dataRow.passport_id)]
              reward.hours_spent_total += Number(dataRow.hours_spent_total)
              reward.hours_spent_total = Number(Number(reward.hours_spent_total).toFixed(2))
              reward.reward_nation += Number(dataRow.reward_nation)
              reward.reward_nation = Number(Number(reward.reward_nation).toFixed(2))
              rewardsQuarterly[String(dataRow.passport_id)] = reward
            }
          }
        })
        console.debug('rewardsQuarterly:', rewardsQuarterly)
      }

      // Increase week end date by 7 days
      weekEndDate.setDate(weekEndDate.getDate() + 7)
    }

    // Export to CSV
    if (Object.keys(rewardsQuarterly).length) {
      exportToCSV(quarterEndDate, rewardsQuarterly)
    }

    // Increase quarter end date by 13 weeks
      quarterEndDate.setDate(quarterEndDate.getDate() + 13*7)
  }
}

async function loadCSVData(filePath) {
  // console.log('loadCSVData')

  const dataFile = fs.readFileSync(filePath)
  const csvData = dataFile.toString()
  // console.log('csvData:\n', csvData)

  return new Promise(resolve => {
    Papa.parse(csvData, {
      header: true,
      complete: (results) => {
        // console.log('complete')
        resolve(results.data)
      }
    })
  })
}

function exportToCSV(quarterEndDate, rewards) {
  console.log('exportToCSV')

  const filename = 'quarterly/' + quarterEndDate.toISOString().substring(0, 10) + '_rewards.csv'
  const writeableStream = fs.createWriteStream(filename)
  const columns = [
      'passport_id',
      'profile_id',
      'hours_spent_total',
      'reward_nation'
  ];
  const stringifier = stringify({ header: true, columns: columns })
  for (const passportID in rewards) {
    const reward = rewards[passportID]
    console.log('reward:', reward)
    stringifier.write(reward)
  }
  stringifier.pipe(writeableStream)
  console.log('Finished writing data to CSV:', filename)
}
