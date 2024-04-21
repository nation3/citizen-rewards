const fs = require('fs')
const Papa = require('papaparse')
const { stringify } = require('csv-stringify');

const weeklyBudget = 16 // https://discord.com/channels/690584551239581708/1177835821596938372/1181552431444791356

generate()

async function generate() {
  console.log('generate')

  // Load the Coordinape contributions
  const contributionsFilePath = `../contributions/coordinape-contributions.csv`
  console.debug('contributionsFilePath:', contributionsFilePath)
  let contributionsData = []
  if (!fs.existsSync(contributionsFilePath)) {
    console.error('File does not exist')
    return
  } else {
    contributionsData = await loadCSVData(contributionsFilePath)
  }
  // console.debug('contributionsData:', contributionsData)

  // Iterate every week from the week of [Sun May-29-2022 → Sun Jun-05-2022] until now
  const weekEndDate = new Date('2022-06-05T00:00:00Z')
  console.debug('weekEndDate:', weekEndDate)
  const nowDate = new Date()
  console.debug('nowDate:', nowDate)
  while (nowDate.getTime() > weekEndDate.getTime()) {
    const weekBeginDate = new Date(weekEndDate.getTime() - 7*24*60*60*1000)
    console.info('week:', `[${weekBeginDate.toISOString()} → ${weekEndDate.toISOString()}]`)

    // Extract this week's contributions
    let contributionsDataThisWeek = []
    contributionsData.forEach((dataRow) => {
      const updatedAt = dataRow.updated_at
      // console.debug('updatedAt:', updatedAt)
      if (updatedAt != undefined) {
        const updatedAtDate = new Date(updatedAt)
        // console.debug('updatedAtDate:', updatedAtDate)
        if (updatedAtDate.getTime() >= weekBeginDate.getTime()
            && updatedAtDate.getTime() < weekEndDate.getTime()
        ) {
          console.debug('updatedAtDate:', updatedAtDate)
          contributionsDataThisWeek.push(dataRow)
        }
      }
    })
    console.debug('contributionsDataThisWeek:', contributionsDataThisWeek)

    // Summarize hours spent for each citizen
    let rewards = {}
    contributionsDataThisWeek.forEach((dataRow) => {
      if (rewards[String(dataRow.passport_id)] == undefined) {
        const reward = {
          passport_id: Number(dataRow.passport_id),
          profile_id: Number(dataRow.profile_id),
          hours_spent_total: Number(dataRow.hours_spent)
        }
        rewards[String(dataRow.passport_id)] = reward
      } else {
        const reward = rewards[String(dataRow.passport_id)]
        reward.hours_spent_total += Number(dataRow.hours_spent)
        reward.hours_spent_total = Number(Number(reward.hours_spent_total).toFixed(2))
        rewards[String(dataRow.passport_id)] = reward
      }
    })
    console.debug('rewards:', rewards)

    // Calculate hours spent by all citizens combined
    let hoursSpentAllCitizens = 0
    Object.keys(rewards).forEach((passportID) => {
      console.debug('passportID:', passportID)
      hoursSpentAllCitizens += rewards[passportID].hours_spent_total
    })
    console.debug('hoursSpentAllCitizens:', hoursSpentAllCitizens)

    // Calculate each citizen's reward percentage
    Object.keys(rewards).forEach((passportID) => {
      console.debug('passportID:', passportID)
      const reward = rewards[passportID]
      const rewardPercentage = 100 * reward.hours_spent_total / hoursSpentAllCitizens
      reward.reward_percentage = Number(rewardPercentage.toFixed(2))
      reward.reward_nation = Number((weeklyBudget * rewardPercentage / 100).toFixed(2))
    })

    // Export to CSV
    if (Object.keys(rewards).length) {
      exportToCSV(weekEndDate, rewards)
    }

    // Increase week end date by 7 days
    weekEndDate.setDate(weekEndDate.getDate() + 7)
  }
}

async function loadCSVData(filePath) {
  console.info('loadCSVData')

  const dataFile = fs.readFileSync(filePath)
  const csvData = dataFile.toString()
  console.debug('csvData:\n', csvData)

  return new Promise(resolve => {
    Papa.parse(csvData, {
      header: true,
      complete: (results) => {
        console.log('complete')
        resolve(results.data)
      }
    })
  })
}

function exportToCSV(weekEndDate, rewards) {
  console.log('exportToCSV')

  const filename = 'weekly/' + weekEndDate.toISOString().substring(0, 10) + '_rewards.csv'
  const writeableStream = fs.createWriteStream(filename)
  const columns = [
      'passport_id',
      'profile_id',
      'hours_spent_total',
      'reward_percentage',
      'reward_nation'
  ];
  const stringifier = stringify({ header: true, columns: columns })
  for (const passportID in rewards) {
    const reward = rewards[passportID]
    console.debug('reward:', reward)
    stringifier.write(reward)
  }
  stringifier.pipe(writeableStream)
  console.log('Finished writing data to CSV:', filename)
}
