'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  LogOut,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  Package,
  DollarSign,
  MapPin,
  Tag,
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { signOut } from '@/app/actions/auth'
import {
  createProduct,
  updateProduct,
  deleteProduct,
  toggleProductStock,
  toggleProductActive,
  updateProductPrice,
} from '@/app/actions/products'
import { toast } from 'sonner'
import type { Category, Product } from '@/lib/types/database'

type ProductWithCategory = Product & { categories: Category | null }

interface AdminDashboardProps {
  initialProducts: ProductWithCategory[]
  categories: Category[]
}

export function AdminDashboard({
  initialProducts,
  categories,
}: AdminDashboardProps) {
  const [products, setProducts] = useState(initialProducts)
  const [editingPrice, setEditingPrice] = useState<string | null>(null)
  const [priceValue, setPriceValue] = useState('')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<ProductWithCategory | null>(null)

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(price)
  }

  const handleToggleStock = async (product: ProductWithCategory) => {
    const newValue = !product.is_out_of_stock
    setProducts((prev) =>
      prev.map((p) =>
        p.id === product.id ? { ...p, is_out_of_stock: newValue } : p
      )
    )
    const result = await toggleProductStock(product.id, newValue)
    if (result.error) {
      toast.error(result.error)
      setProducts((prev) =>
        prev.map((p) =>
          p.id === product.id ? { ...p, is_out_of_stock: !newValue } : p
        )
      )
    } else {
      toast.success(newValue ? 'Marcado sin stock' : 'Stock disponible')
    }
  }

  const handleToggleActive = async (product: ProductWithCategory) => {
    const newValue = !product.is_active
    setProducts((prev) =>
      prev.map((p) => (p.id === product.id ? { ...p, is_active: newValue } : p))
    )
    const result = await toggleProductActive(product.id, newValue)
    if (result.error) {
      toast.error(result.error)
      setProducts((prev) =>
        prev.map((p) =>
          p.id === product.id ? { ...p, is_active: !newValue } : p
        )
      )
    } else {
      toast.success(newValue ? 'Producto activado' : 'Producto desactivado')
    }
  }

  const handlePriceEdit = (product: ProductWithCategory) => {
    setEditingPrice(product.id)
    setPriceValue(product.price.toString())
  }

  const handlePriceSave = async (productId: string) => {
    const price = parseFloat(priceValue)
    if (isNaN(price) || price < 0) {
      toast.error('Precio inválido')
      return
    }

    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, price } : p))
    )
    setEditingPrice(null)

    const result = await updateProductPrice(productId, price)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Precio actualizado')
    }
  }

  const handleDelete = async (productId: string) => {
    if (!confirm('¿Estás seguro de eliminar este producto?')) return

    setProducts((prev) => prev.filter((p) => p.id !== productId))
    const result = await deleteProduct(productId)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Producto eliminado')
    }
  }

  const handleAddProduct = async (formData: FormData) => {
    const result = await createProduct(formData)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Producto creado')
      setIsAddDialogOpen(false)
      window.location.reload()
    }
  }

  const handleEditProduct = async (formData: FormData) => {
    if (!editingProduct) return

    const result = await updateProduct(editingProduct.id, {
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      price: parseFloat(formData.get('price') as string),
      category_id: formData.get('category_id') as string,
      image_url: (formData.get('image_url') as string) || undefined,
    })

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Producto actualizado')
      setIsEditDialogOpen(false)
      window.location.reload()
    }
  }

  const activeProducts = products.filter(p => p.is_active)
  const outOfStock = products.filter(p => p.is_out_of_stock)

  return (
    <div className="min-h-screen bg-slate-950">
      <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/95 backdrop-blur-xl shadow-lg">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#FFAE00] to-orange-600 rounded-xl flex items-center justify-center text-xl shadow-lg shadow-[#FFAE00]/20">
              🍔
            </div>
            <div>
              <span className="text-xl font-bold text-white">
                Que <span className="text-[#FFAE00]">Copado</span>
              </span>
              <Badge className="bg-slate-800 text-slate-300 ml-2 text-xs">Admin</Badge>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/admin/categories">
              <Button
                variant="ghost"
                className="text-slate-400 hover:text-white hover:bg-slate-800/50 transition-all duration-200"
              >
                <Tag className="h-4 w-4 mr-2" />
                Categorías
              </Button>
            </Link>
            <Link href="/admin/delivery-zones">
              <Button
                variant="ghost"
                className="text-slate-400 hover:text-white hover:bg-slate-800/50 transition-all duration-200"
              >
                <MapPin className="h-4 w-4 mr-2" />
                Zonas de Envío
              </Button>
            </Link>
            <form action={signOut}>
              <Button
                type="submit"
                variant="ghost"
                className="text-slate-400 hover:text-red-400 hover:bg-red-950/20 transition-all duration-200"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Salir
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-slate-900/50 backdrop-blur border border-slate-800 rounded-xl p-6 hover:border-[#FFAE00]/30 transition-colors duration-200"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm font-medium">Total de Productos</p>
                <p className="text-3xl font-bold text-white mt-1">{products.length}</p>
              </div>
              <div className="w-12 h-12 bg-[#FFAE00]/10 rounded-xl flex items-center justify-center">
                <Package className="h-6 w-6 text-[#FFAE00]" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-slate-900/50 backdrop-blur border border-slate-800 rounded-xl p-6 hover:border-green-500/30 transition-colors duration-200"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm font-medium">Productos Activos</p>
                <p className="text-3xl font-bold text-white mt-1">{activeProducts.length}</p>
              </div>
              <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center">
                <Check className="h-6 w-6 text-green-500" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-slate-900/50 backdrop-blur border border-slate-800 rounded-xl p-6 hover:border-red-500/30 transition-colors duration-200"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm font-medium">Sin Stock</p>
                <p className="text-3xl font-bold text-white mt-1">{outOfStock.length}</p>
              </div>
              <div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center">
                <X className="h-6 w-6 text-red-500" />
              </div>
            </div>
          </motion.div>
        </div>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">
              Gestión de Productos
            </h1>
            <p className="text-slate-400 text-sm">
              Administra el catálogo de tu negocio
            </p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-[#FFAE00] to-orange-500 hover:from-[#E09D00] hover:to-orange-600 text-black font-semibold shadow-lg shadow-[#FFAE00]/25 hover:shadow-xl hover:shadow-[#FFAE00]/30 transition-all duration-200 hover:scale-105 active:scale-95">
                <Plus className="h-4 w-4 mr-2" />
                Agregar Producto
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-950 border-slate-800 max-w-md shadow-2xl">
              <DialogHeader>
                <DialogTitle className="text-white text-xl">
                  Nuevo Producto
                </DialogTitle>
                <p className="text-slate-400 text-sm mt-1">
                  Completa los datos para agregar un nuevo producto al catálogo
                </p>
              </DialogHeader>
              <form action={handleAddProduct} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label className="text-slate-300 font-medium">Nombre</Label>
                  <Input
                    name="name"
                    required
                    placeholder="Ej: Hamburguesa Completa"
                    className="bg-slate-900/50 border-slate-700 text-white h-11 focus:border-[#FFAE00]/50 focus:ring-2 focus:ring-[#FFAE00]/20 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300 font-medium">Descripcion</Label>
                  <Textarea
                    name="description"
                    placeholder="Describe el producto..."
                    className="bg-slate-900/50 border-slate-700 text-white resize-none h-20 focus:border-[#FFAE00]/50 focus:ring-2 focus:ring-[#FFAE00]/20 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300 font-medium">Precio</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-semibold">$</span>
                    <Input
                      name="price"
                      type="number"
                      step="1"
                      required
                      placeholder="3500"
                      className="bg-slate-900/50 border-slate-700 text-white h-11 pl-7 focus:border-[#FFAE00]/50 focus:ring-2 focus:ring-[#FFAE00]/20 transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300 font-medium">Categoria</Label>
                  <Select name="category_id" required>
                    <SelectTrigger className="bg-slate-900/50 border-slate-700 text-white h-11 focus:ring-2 focus:ring-[#FFAE00]/20">
                      <SelectValue placeholder="Seleccionar categoria..." />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700">
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id} className="focus:bg-slate-800 focus:text-white">
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300 font-medium">URL de imagen (opcional)</Label>
                  <Input
                    name="image_url"
                    type="url"
                    placeholder="https://..."
                    className="bg-slate-900/50 border-slate-700 text-white h-11 focus:border-[#FFAE00]/50 focus:ring-2 focus:ring-[#FFAE00]/20 transition-all"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full h-11 bg-gradient-to-r from-[#FFAE00] to-orange-500 hover:from-[#E09D00] hover:to-orange-600 text-black font-semibold shadow-lg shadow-[#FFAE00]/25 hover:shadow-xl hover:shadow-[#FFAE00]/30 transition-all duration-200"
                >
                  Crear Producto
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {products.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-slate-800 bg-slate-900/30 overflow-hidden"
          >
            <div className="p-16 text-center">
              <div className="w-20 h-20 bg-slate-800/50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Package className="h-10 w-10 text-slate-600" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">No hay productos todavía</h3>
              <p className="text-slate-400 mb-6 max-w-sm mx-auto">
                Comienza agregando tu primer producto al catálogo para que los clientes puedan hacer pedidos.
              </p>
              <Button
                onClick={() => setIsAddDialogOpen(true)}
                className="bg-gradient-to-r from-[#FFAE00] to-orange-500 hover:from-[#E09D00] hover:to-orange-600 text-black font-semibold shadow-lg shadow-[#FFAE00]/25"
              >
                <Plus className="h-4 w-4 mr-2" />
                Agregar Primer Producto
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="rounded-xl border border-slate-800 bg-slate-900/30 overflow-hidden backdrop-blur"
          >
            <Table>
              <TableHeader>
                <TableRow className="border-slate-800 hover:bg-slate-900/50">
                  <TableHead className="text-slate-400 font-semibold">Producto</TableHead>
                  <TableHead className="text-slate-400 font-semibold">Categoria</TableHead>
                  <TableHead className="text-slate-400 font-semibold">Precio</TableHead>
                  <TableHead className="text-slate-400 font-semibold text-center">
                    Stock
                  </TableHead>
                  <TableHead className="text-slate-400 font-semibold text-center">
                    Activo
                  </TableHead>
                  <TableHead className="text-slate-400 font-semibold text-right">
                    Acciones
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product, index) => (
                <motion.tr
                  key={product.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="border-slate-800 hover:bg-slate-800/30 transition-colors duration-200 group"
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-lg bg-slate-800 flex items-center justify-center overflow-hidden group-hover:ring-2 group-hover:ring-[#FFAE00]/30 transition-all duration-200">
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt={product.name}
                            className="h-12 w-12 object-cover group-hover:scale-110 transition-transform duration-200"
                          />
                        ) : (
                          <Package className="h-5 w-5 text-slate-500" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-white group-hover:text-[#FFAE00] transition-colors duration-200">{product.name}</p>
                        {product.description && (
                          <p className="text-sm text-slate-500 truncate max-w-xs">
                            {product.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className="border-slate-700 text-slate-300 bg-slate-800/30 font-medium"
                    >
                      {product.categories?.name || 'Sin categoria'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {editingPrice === product.id ? (
                      <div className="flex items-center gap-2">
                        <Input
                          value={priceValue}
                          onChange={(e) => setPriceValue(e.target.value)}
                          className="w-28 h-9 bg-slate-900 border-slate-700 text-white focus:border-[#FFAE00] focus:ring-2 focus:ring-[#FFAE00]/20"
                          type="number"
                          autoFocus
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-9 w-9 text-green-500 hover:text-green-400 hover:bg-green-950/30 transition-colors"
                          onClick={() => handlePriceSave(product.id)}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-9 w-9 text-red-500 hover:text-red-400 hover:bg-red-950/30 transition-colors"
                          onClick={() => setEditingPrice(null)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handlePriceEdit(product)}
                        className="flex items-center gap-1.5 text-[#FFAE00] hover:text-[#E09D00] transition-all duration-200 font-semibold group/price px-2 py-1 rounded-lg hover:bg-[#FFAE00]/10"
                      >
                        {formatPrice(product.price)}
                        <DollarSign className="h-3.5 w-3.5 opacity-50 group-hover/price:opacity-100 transition-opacity" />
                      </button>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex justify-center">
                      <Switch
                        checked={!product.is_out_of_stock}
                        onCheckedChange={() => handleToggleStock(product)}
                        className="data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-slate-700"
                      />
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex justify-center">
                      <Switch
                        checked={product.is_active}
                        onCheckedChange={() => handleToggleActive(product)}
                        className="data-[state=checked]:bg-[#FFAE00] data-[state=unchecked]:bg-slate-700"
                      />
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-9 w-9 text-slate-400 hover:text-white hover:bg-slate-800 transition-all duration-200"
                        onClick={() => {
                          setEditingProduct(product)
                          setIsEditDialogOpen(true)
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-9 w-9 text-red-500 hover:text-red-400 hover:bg-red-950/30 transition-all duration-200"
                        onClick={() => handleDelete(product.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </motion.tr>
                ))}
              </TableBody>
            </Table>
          </motion.div>
        )}

        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="bg-slate-950 border-slate-800 max-w-md shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-white text-xl">Editar Producto</DialogTitle>
              <p className="text-slate-400 text-sm mt-1">
                Modifica los datos del producto
              </p>
            </DialogHeader>
            {editingProduct && (
              <form action={handleEditProduct} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label className="text-slate-300 font-medium">Nombre</Label>
                  <Input
                    name="name"
                    defaultValue={editingProduct.name}
                    required
                    className="bg-slate-900/50 border-slate-700 text-white h-11 focus:border-[#FFAE00]/50 focus:ring-2 focus:ring-[#FFAE00]/20 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300 font-medium">Descripcion</Label>
                  <Textarea
                    name="description"
                    defaultValue={editingProduct.description || ''}
                    className="bg-slate-900/50 border-slate-700 text-white resize-none h-20 focus:border-[#FFAE00]/50 focus:ring-2 focus:ring-[#FFAE00]/20 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300 font-medium">Precio</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-semibold">$</span>
                    <Input
                      name="price"
                      type="number"
                      step="1"
                      defaultValue={editingProduct.price}
                      required
                      className="bg-slate-900/50 border-slate-700 text-white h-11 pl-7 focus:border-[#FFAE00]/50 focus:ring-2 focus:ring-[#FFAE00]/20 transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300 font-medium">Categoria</Label>
                  <Select
                    name="category_id"
                    defaultValue={editingProduct.category_id}
                    required
                  >
                    <SelectTrigger className="bg-slate-900/50 border-slate-700 text-white h-11 focus:ring-2 focus:ring-[#FFAE00]/20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700">
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id} className="focus:bg-slate-800 focus:text-white">
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300 font-medium">URL de imagen (opcional)</Label>
                  <Input
                    name="image_url"
                    type="url"
                    defaultValue={editingProduct.image_url || ''}
                    placeholder="https://..."
                    className="bg-slate-900/50 border-slate-700 text-white h-11 focus:border-[#FFAE00]/50 focus:ring-2 focus:ring-[#FFAE00]/20 transition-all"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full h-11 bg-gradient-to-r from-[#FFAE00] to-orange-500 hover:from-[#E09D00] hover:to-orange-600 text-black font-semibold shadow-lg shadow-[#FFAE00]/25 hover:shadow-xl hover:shadow-[#FFAE00]/30 transition-all duration-200"
                >
                  Guardar Cambios
                </Button>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  )
}
