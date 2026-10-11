import { DeleteObjectsCommand, ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3'

// Daily check that the 7-day photo deletion policy really holds. The S3 lifecycle rule does the
// deleting; this job counts anything it missed, deletes it, and reports both as CloudWatch metrics.
const s3 = new S3Client({ region: process.env.AWS_REGION ?? 'ap-south-1' })
const staleAfterMs = 8 * 86400_000

export async function handler() {
  const bucket = process.env.PHOTO_BUCKET!
  let checked = 0
  const stale: string[] = []
  let token: string | undefined
  do {
    const page = await s3.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: 'photos/', ContinuationToken: token }))
    for (const object of page.Contents ?? []) {
      checked += 1
      if (object.Key && object.LastModified && Date.now() - object.LastModified.getTime() > staleAfterMs) stale.push(object.Key)
    }
    token = page.NextContinuationToken
  } while (token)
  let deleted = 0
  for (let i = 0; i < stale.length; i += 1000) {
    const res = await s3.send(
      new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects: stale.slice(i, i + 1000).map((Key) => ({ Key })), Quiet: true } }),
    )
    deleted += stale.slice(i, i + 1000).length - (res.Errors?.length ?? 0)
  }
  process.stdout.write(
    `${JSON.stringify({
      _aws: {
        Timestamp: Date.now(),
        CloudWatchMetrics: [
          {
            Namespace: 'SafeDrop',
            Dimensions: [['Service']],
            Metrics: [
              { Name: 'PhotosChecked', Unit: 'Count' },
              { Name: 'StalePhotosFound', Unit: 'Count' },
              { Name: 'StalePhotosDeleted', Unit: 'Count' },
            ],
          },
        ],
      },
      Service: 'photo-retention',
      PhotosChecked: checked,
      StalePhotosFound: stale.length,
      StalePhotosDeleted: deleted,
    })}
`,
  )
  return { checked, stale: stale.length, deleted }
}
