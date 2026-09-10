import { useState } from 'react'
import { View, Text } from '@tarojs/components'

interface JSONTreeProps { data: unknown; [key: string]: unknown }

function JsonNode({ name, value, parents = [] }: { name: string; value: unknown; parents?: unknown[] }) {
  const [expanded, setExpanded] = useState(false)
  const object = value !== null && typeof value === 'object'
  const circular = object && parents.includes(value)
  const entries = object && !circular ? Object.entries(value) : []
  return <View style={{ paddingLeft: 12 }}>
    <Text style={{ minHeight: 44, color: '#334155', paddingTop: 10 }} onClick={() => setExpanded(!expanded)}>
      {object && !circular ? (expanded ? '▾ ' : '▸ ') : ''}{name}: {circular ? '[Circular]' : object ? `${Array.isArray(value) ? 'Array' : 'Object'} (${entries.length})` : String(value)}
    </Text>
    {expanded && entries.map(([key, item]) => <JsonNode key={key} name={key} value={item} parents={[...parents, value]} />)}
  </View>
}

/** 可展开的只读 JSON 查看器；无 DOM 依赖，循环引用安全。 */
export default function JSONTree({ data }: JSONTreeProps) {
  if (data == null) return <View />
  return <View>{typeof data === 'object' ? Object.entries(data).map(([key, value]) => <JsonNode key={key} name={key} value={value} parents={[data]} />) : <JsonNode name='value' value={data} />}</View>
}
