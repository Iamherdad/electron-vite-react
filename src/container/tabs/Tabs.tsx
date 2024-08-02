import { Tabs } from 'antd'
import type { TabsProps } from 'antd'
import AppList from '../app-list/App-list'

const TABS_STYLE: Partial<TabsProps> = {
  tabPosition: 'left',
  type: 'card' as TabsProps['type'],
  size: 'large'
}

const items: TabsProps['items'] = [
  {
    key: '1',
    label: '已安装',
    children: <AppList type={1} />
  },
  {
    key: '2',
    label: '全部',
    children: <AppList type={2} />
  }
]

const TabsCom = (): JSX.Element => {
  return <Tabs defaultActiveKey="1" items={items} onChange={() => {}} {...TABS_STYLE} />
}

export default TabsCom
