import {render, screen, waitFor} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {beforeEach, describe, expect, it, vi} from 'vitest'

/** router 在模块级创建并持有导航状态，每个用例重新加载模块以保证隔离。 */
const renderApp = async (hash = '#/') => {
  window.location.hash = hash
  vi.resetModules()
  const {default: App} = await import('../App')
  return render(<App/>)
}

describe('react-demo 集成流程', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  it('未登录访问首页时跳转到登录页', async () => {
    await renderApp('#/')
    expect(await screen.findByText('登录页')).toBeInTheDocument()
    expect(window.location.hash).toBe('#/sign-in')
  })

  it('登录后进入首页并展示当前用户', async () => {
    await renderApp('#/sign-in')
    await userEvent.click(await screen.findByText('进入'))
    expect(await screen.findByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('当前用户：admin')).toBeInTheDocument()
  })

  it('拥有 security 权限时可以访问 Security 页', async () => {
    await renderApp('#/sign-in')
    await userEvent.click(await screen.findByText('进入'))
    await userEvent.click(await screen.findByText('Security'))
    expect(await screen.findByText('Security Page')).toBeInTheDocument()
  })

  it('Permission 页按权限展示按钮', async () => {
    await renderApp('#/sign-in')
    await userEvent.click(await screen.findByText('进入'))
    await userEvent.click(await screen.findByText('Permission'))

    for (const visible of ['create', 'update', 'create && update true', 'create || update true']) {
      expect(await screen.findByRole('button', {name: visible})).toBeInTheDocument()
    }
    for (const hidden of ['create && delete false', 'delete false']) {
      expect(screen.queryByRole('button', {name: hidden})).not.toBeInTheDocument()
    }
  })

  it('退出后只触发 onSignOut 并回到登录页', async () => {
    await renderApp('#/sign-in')
    await userEvent.click(await screen.findByText('进入'))
    await userEvent.click(await screen.findByText('退出'))

    expect(await screen.findByText('登录页')).toBeInTheDocument()
    await waitFor(() => expect(console.log).toHaveBeenCalledWith('onSignOut'))
    expect(console.log).not.toHaveBeenCalledWith('onUnAuthenticated')
  })
})
