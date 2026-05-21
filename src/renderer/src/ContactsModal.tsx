import { useState, useEffect } from 'react'
import { Contact } from '../../types'

interface ContactsModalProps {
  isOpen: boolean
  onClose: () => void
  contacts: Contact[]
  onSaveContacts: (contacts: Contact[]) => void
}

export function ContactsModal({ isOpen, onClose, contacts, onSaveContacts }: ContactsModalProps) {
  const [localContacts, setLocalContacts] = useState<Contact[]>(contacts)
  const [searchText, setSearchText] = useState('')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')

  useEffect(() => {
    setLocalContacts(contacts)
  }, [contacts])

  useEffect(() => {
    if (editingContact) {
      setName(editingContact.name)
      setPhone(editingContact.phone)
    } else {
      setName('')
      setPhone('')
    }
  }, [editingContact, isFormOpen])

  const filteredContacts = localContacts.filter(c =>
    c.name.includes(searchText) || c.phone.includes(searchText)
  )

  const handleSaveContact = () => {
    if (!name.trim()) {
      alert('请输入姓名')
      return
    }
    if (!phone.trim()) {
      alert('请输入电话')
      return
    }

    let updated: Contact[]

    if (editingContact) {
      updated = localContacts.map(c =>
        c.id === editingContact.id ? { ...c, name: name.trim(), phone: phone.trim() } : c
      )
    } else {
      const newContact: Contact = {
        id: Date.now().toString(),
        name: name.trim(),
        phone: phone.trim(),
        createdAt: new Date().toISOString()
      }
      updated = [...localContacts, newContact]
    }

    setLocalContacts(updated)
    onSaveContacts(updated)
    setIsFormOpen(false)
    setEditingContact(null)
  }

  const handleEdit = (contact: Contact) => {
    setEditingContact(contact)
    setIsFormOpen(true)
  }

  const handleDelete = (id: string) => {
    if (!confirm('确定删除此联系人吗？')) return
    const updated = localContacts.filter(c => c.id !== id)
    setLocalContacts(updated)
    onSaveContacts(updated)
  }

  const handleNew = () => {
    setEditingContact(null)
    setIsFormOpen(true)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      alert('已复制到剪贴板')
    }).catch(() => {
      alert('复制失败')
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 overflow-auto">
      <div className="min-h-screen py-8 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4">
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-800">通讯录</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded text-gray-600"
            >
              ✕
            </button>
          </div>

          <div className="p-4 border-b border-gray-200 flex items-center justify-between gap-2">
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="搜索姓名或电话..."
            />
            <button
              onClick={handleNew}
              className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded whitespace-nowrap"
            >
              + 新增联系人
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {filteredContacts.length === 0 ? (
              <div className="text-sm text-gray-400 text-center py-8">
                {searchText ? '没有找到匹配的联系人' : '暂无联系人，点击"新增联系人"添加'}
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">姓名</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">电话</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredContacts.map(contact => (
                    <tr key={contact.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-800">{contact.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{contact.phone}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => copyToClipboard(contact.phone)}
                            className="px-2 py-1 text-xs hover:bg-gray-200 rounded"
                            title="复制电话"
                          >
                            📋
                          </button>
                          <button
                            onClick={() => handleEdit(contact)}
                            className="px-2 py-1 text-xs hover:bg-gray-200 rounded"
                            title="编辑"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDelete(contact.id)}
                            className="px-2 py-1 text-xs hover:bg-gray-200 rounded text-red-500"
                            title="删除"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {isFormOpen && (
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <h3 className="text-sm font-medium text-gray-700 mb-3">
                {editingContact ? '编辑联系人' : '新增联系人'}
              </h3>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">姓名</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="输入姓名"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">电话</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="输入电话号码"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setIsFormOpen(false)
                    setEditingContact(null)
                  }}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-200 rounded"
                >
                  取消
                </button>
                <button
                  onClick={handleSaveContact}
                  className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded"
                >
                  保存
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
