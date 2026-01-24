import payload from 'payload'

const generateCode = (length = 16): string => {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ' // 去掉 0,1,O,I
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  // 格式化为 XXXX-XXXX-XXXX-XXXX
  return result.replace(/(.{4})(?=.)/g, ' $ 1-')
}

export const generateCoupons = async (
  req: Request & { body?: { count?: number; batchId?: string } },
  res: {
    status: (code: number) => { json: (data: unknown) => void }
    json: (data: unknown) => void
  },
) => {
  try {
    const { count = 10, batchId = Date.now().toString() } = req.body || {}

    if (count > 1000) {
      return res.status(400).json({ error: '一次最多生成1000个' })
    }

    const codes = []
    for (let i = 0; i < count; i++) {
      codes.push({
        code: generateCode(),
        batchId,
        used: false,
        value: 10, // Default value as specified in the collection config
      })
    }

    // 批量插入（注意：Payload 的 create 不支持真正的 bulk insert，但可以循环）
    const results = []
    for (const item of codes) {
      try {
        const doc = await payload.create({
          collection: 'coupons',
          data: item,
        })
        results.push(doc)
      } catch (_error) {
        // 跳过重复（理论上不会发生，因随机+唯一索引）
        console.warn('Duplicate code skipped')
      }
    }

    res.json({
      success: true,
      generated: results.length,
      batchId,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: '生成失败' })
  }
}
