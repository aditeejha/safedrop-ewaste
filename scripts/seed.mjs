// Seeds the demo drop-off point and the single judges' demo account (citizen + partner).
import {
  AdminAddUserToGroupCommand,
  AdminCreateUserCommand,
  AdminGetUserCommand,
  AdminSetUserPasswordCommand,
  AdminUpdateUserAttributesCommand,
  CognitoIdentityProviderClient,
} from '@aws-sdk/client-cognito-identity-provider'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb'
import { GeocodeCommand, GeoPlacesClient } from '@aws-sdk/client-geo-places'
import { readFileSync } from 'node:fs'
import { approveCollector } from './approve-collector.mjs'

const region = 'ap-south-1'
const outputs = JSON.parse(readFileSync('infra/outputs.json', 'utf8')).SafeDropEwaste
const db = DynamoDBDocumentClient.from(new DynamoDBClient({ region }))
const cognito = new CognitoIdentityProviderClient({ region })
const places = new GeoPlacesClient({ region })

const demo = {
  email: process.env.DEMO_EMAIL ?? 'demo@example.com',
  password: process.env.DEMO_PASSWORD ?? 'SafeDrop@2026',
  name: 'Aditee Jha',
}

const address = 'Delhi Technological University, Shahbad Daulatpur, Bawana Road, Delhi 110042'
const place = await places.send(
  new GeocodeCommand({ QueryText: address, Filter: { IncludeCountries: ['IND'] }, IntendedUse: 'Storage', MaxResults: 1 }),
)
const [lng, lat] = place.ResultItems[0].Position

const point = {
  pk: 'POINT',
  sk: 'demo-dtu',
  id: 'demo-dtu',
  name: 'SafeDrop Demo Drop Point, DTU',
  address: place.ResultItems[0].Address?.Label ?? address,
  lat: Number(lat.toFixed(6)),
  lng: Number(lng.toFixed(6)),
  hours: 'Mon–Sat, 10:00–18:00',
  demo: true,
  note: 'Demonstration drop point for judging. Bookings here are confirmed from the Partner portal with the demo account.',
}
await db.send(new PutCommand({ TableName: outputs.TableName, Item: point }))
console.log('point', point.name, point.lat, point.lng)

const attributes = [
  { Name: 'email', Value: demo.email },
  { Name: 'email_verified', Value: 'true' },
  { Name: 'name', Value: demo.name },
  { Name: 'custom:pointId', Value: point.id },
]
try {
  await cognito.send(
    new AdminCreateUserCommand({ UserPoolId: outputs.UserPoolId, Username: demo.email, MessageAction: 'SUPPRESS', UserAttributes: attributes }),
  )
} catch (err) {
  if (err.name !== 'UsernameExistsException') throw err
  await cognito.send(new AdminUpdateUserAttributesCommand({ UserPoolId: outputs.UserPoolId, Username: demo.email, UserAttributes: attributes }))
}
await cognito.send(
  new AdminSetUserPasswordCommand({ UserPoolId: outputs.UserPoolId, Username: demo.email, Password: demo.password, Permanent: true }),
)
for (const GroupName of ['partner', 'demo']) {
  await cognito.send(new AdminAddUserToGroupCommand({ UserPoolId: outputs.UserPoolId, Username: demo.email, GroupName }))
}
console.log('demo account ready:', demo.email)

const user = await cognito.send(new AdminGetUserCommand({ UserPoolId: outputs.UserPoolId, Username: demo.email }))
const sub = user.UserAttributes.find((a) => a.Name === 'sub').Value
await db.send(
  new PutCommand({
    TableName: outputs.TableName,
    Item: {
      pk: 'COLLECTOR',
      sk: sub,
      id: sub,
      name: 'Ramesh Kumar (Demo)',
      phone: '',
      area: 'Rohini and Bawana, North West Delhi',
      pincodes: [],
      requestedPincodes: ['110042', '110039', '110085', '110086', '110089'],
      status: 'pending',
      createdAt: new Date().toISOString(),
    },
  }),
)
console.log('demo pickup partner', await approveCollector(sub))
