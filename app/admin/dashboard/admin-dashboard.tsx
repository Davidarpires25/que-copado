'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  Package,
  DollarSign,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { AdminLayout } from '@/components/admin/layout'
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
    <AdminLayout title="Productos" description="Administra el catálogo de tu negocio">
      {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-[#1a1d24] backdrop-blur border border-[#2a2f3a] rounded-xl p-6 hover:border-[#FEC501]/30 transition-colors duration-200"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#8b9ab0] text-sm font-medium">Total de Productos</p>
                <p className="text-3xl font-bold text-[#f0f2f5] mt-1">{products.length}</p>
              </div>
              <div className="w-12 h-12 bg-[#FEC501]/10 rounded-xl flex items-center justify-center">
                <Package className="h-6 w-6 text-[#FEC501]" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-[#1a1d24] backdrop-blur border border-[#2a2f3a] rounded-xl p-6 hover:border-green-500/30 transition-colors duration-200"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#8b9ab0] text-sm font-medium">Productos Activos</p>
                <p className="text-3xl font-bold text-[#f0f2f5] mt-1">{activeProducts.length}</p>
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
            className="bg-[#1a1d24] backdrop-blur border border-[#2a2f3a] rounded-xl p-6 hover:border-red-500/30 transition-colors duration-200"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#8b9ab0] text-sm font-medium">Sin Stock</p>
                <p className="text-3xl font-bold text-[#f0f2f5] mt-1">{outOfStock.length}</p>
              </div>
              <div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center">
                <X className="h-6 w-6 text-red-500" />
              </div>
            </div>
          </motion.div>
        </div>

        <div className="flex items-center justify-between mb-6">
          <p className="text-[#8b9ab0]">
            {products.length} {products.length === 1 ? 'producto' : 'productos'}
          </p>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#FEC501] hover:bg-[#E5B001] text-black font-semibold shadow-lg shadow-[#FEC501]/20 transition-all duration-200 hover:scale-105 active:scale-95">
                <Plus className="h-4 w-4 mr-2" />
                Agregar Producto
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#12151a] border-[#2a2f3a] max-w-md shadow-2xl">
              <DialogHeader>
                <DialogTitle className="text-[#f0f2f5] text-xl">
                  Nuevo Producto
                </DialogTitle>
                <p className="text-[#8b9ab0] text-sm mt-1">
                  Completa los datos para agregar un nuevo producto al catálogo
                </p>
              </DialogHeader>
              <form action={handleAddProduct} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label className="text-[#c4cdd9] font-medium">Nombre</Label>
                  <Input
                    name="name"
                    required
                    placeholder="Nombre del producto"
                    className="bg-[#1a1d24] border-[#2a2f3a] text-[#f0f2f5] h-11 placeholder:text-[#8b9ab0] placeholder:italic focus:border-[#FEC501]/50 focus:ring-2 focus:ring-[#FEC501]/20 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#c4cdd9] font-medium">Descripcion</Label>
                  <Textarea
                    name="description"
                    placeholder="Descripción opcional"
                    className="bg-[#1a1d24] border-[#2a2f3a] text-[#f0f2f5] resize-none h-20 placeholder:text-[#8b9ab0] placeholder:italic focus:border-[#FEC501]/50 focus:ring-2 focus:ring-[#FEC501]/20 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#c4cdd9] font-medium">Precio</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8b9ab0] font-semibold">$</span>
                    <Input
                      name="price"
                      type="number"
                      step="1"
                      required
                      placeholder="Precio en pesos"
                      className="bg-[#1a1d24] border-[#2a2f3a] text-[#f0f2f5] h-11 pl-7 placeholder:text-[#8b9ab0] placeholder:italic focus:border-[#FEC501]/50 focus:ring-2 focus:ring-[#FEC501]/20 transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[#c4cdd9] font-medium">Categoria</Label>
                  <Select name="category_id" required>
                    <SelectTrigger className="bg-[#1a1d24] border-[#2a2f3a] text-[#f0f2f5] h-11 focus:ring-2 focus:ring-[#FEC501]/20">
                      <SelectValue placeholder="Seleccionar categoria..." />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1d24] border-[#2a2f3a]">
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id} className="focus:bg-[#2a2f3a] focus:text-[#f0f2f5]">
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[#c4cdd9] font-medium">URL de imagen (opcional)</Label>
                  <Input
                    name="image_url"
                    type="url"
                    placeholder="URL de la imagen"
                    className="bg-[#1a1d24] border-[#2a2f3a] text-[#f0f2f5] h-11 placeholder:text-[#8b9ab0] placeholder:italic focus:border-[#FEC501]/50 focus:ring-2 focus:ring-[#FEC501]/20 transition-all"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full h-11 bg-[#FEC501] hover:bg-[#E5B001] text-black font-semibold shadow-lg shadow-[#FEC501]/20 transition-all duration-200"
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
            className="rounded-xl border border-[#2a2f3a] bg-[#1a1d24] overflow-hidden"
          >
            <div className="p-16 text-center">
              <div className="w-20 h-20 bg-[#252a35] rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Package className="h-10 w-10 text-slate-600" />
              </div>
              <h3 className="text-xl font-semibold text-[#f0f2f5] mb-2">No hay productos todavía</h3>
              <p className="text-[#8b9ab0] mb-6 max-w-sm mx-auto">
                Comienza agregando tu primer producto al catálogo para que los clientes puedan hacer pedidos.
              </p>
              <Button
                onClick={() => setIsAddDialogOpen(true)}
                className="bg-[#FEC501] hover:bg-[#E5B001] text-black font-semibold shadow-lg shadow-[#FEC501]/25"
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
            className="rounded-xl border border-[#2a2f3a] bg-[#1a1d24] overflow-hidden backdrop-blur"
          >
            <Table>
              <TableHeader>
                <TableRow className="border-[#2a2f3a] hover:bg-[#1a1d24]">
                  <TableHead className="text-[#8b9ab0] font-semibold">Producto</TableHead>
                  <TableHead className="text-[#8b9ab0] font-semibold">Categoria</TableHead>
                  <TableHead className="text-[#8b9ab0] font-semibold">Precio</TableHead>
                  <TableHead className="text-[#8b9ab0] font-semibold text-center">
                    Stock
                  </TableHead>
                  <TableHead className="text-[#8b9ab0] font-semibold text-center">
                    Activo
                  </TableHead>
                  <TableHead className="text-[#8b9ab0] font-semibold text-right">
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
                  className="border-[#2a2f3a] hover:bg-[#252a35] transition-colors duration-200 group"
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-lg bg-[#2a2f3a] flex items-center justify-center overflow-hidden group-hover:ring-2 group-hover:ring-[#FEC501]/30 transition-all duration-200">
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt={product.name}
                            className="h-12 w-12 object-cover group-hover:scale-110 transition-transform duration-200"
                          />
                        ) : (
                          <Package className="h-5 w-5 text-[#8b9ab0]" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-[#f0f2f5] group-hover:text-[#FEC501] transition-colors duration-200">{product.name}</p>
                        {product.description && (
                          <p className="text-sm text-[#8b9ab0] truncate max-w-xs">
                            {product.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className="border-[#2a2f3a] text-[#c4cdd9] bg-[#252a35] font-medium"
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
                          className="w-28 h-9 bg-[#1a1d24] border-[#2a2f3a] text-[#f0f2f5] focus:border-[#FEC501] focus:ring-2 focus:ring-[#FEC501]/20"
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
                        className="flex items-center gap-1.5 text-[#FEC501] hover:text-[#E09D00] transition-all duration-200 font-semibold group/price px-2 py-1 rounded-lg hover:bg-[#FEC501]/10"
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
                        className="data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-[#2a2f3a]"
                      />
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex justify-center">
                      <Switch
                        checked={product.is_active}
                        onCheckedChange={() => handleToggleActive(product)}
                        className="data-[state=checked]:bg-[#FEC501] data-[state=unchecked]:bg-[#2a2f3a]"
                      />
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-9 w-9 text-[#8b9ab0] hover:text-[#f0f2f5] hover:bg-[#2a2f3a] transition-all duration-200"
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
          <DialogContent className="bg-[#12151a] border-[#2a2f3a] max-w-md shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-[#f0f2f5] text-xl">Editar Producto</DialogTitle>
              <p className="text-[#8b9ab0] text-sm mt-1">
                Modifica los datos del producto
              </p>
            </DialogHeader>
            {editingProduct && (
              <form action={handleEditProduct} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label className="text-[#c4cdd9] font-medium">Nombre</Label>
                  <Input
                    name="name"
                    defaultValue={editingProduct.name}
                    required
                    className="bg-[#1a1d24] border-[#2a2f3a] text-[#f0f2f5] h-11 focus:border-[#FEC501]/50 focus:ring-2 focus:ring-[#FEC501]/20 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#c4cdd9] font-medium">Descripcion</Label>
                  <Textarea
                    name="description"
                    defaultValue={editingProduct.description || ''}
                    className="bg-[#1a1d24] border-[#2a2f3a] text-[#f0f2f5] resize-none h-20 focus:border-[#FEC501]/50 focus:ring-2 focus:ring-[#FEC501]/20 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#c4cdd9] font-medium">Precio</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8b9ab0] font-semibold">$</span>
                    <Input
                      name="price"
                      type="number"
                      step="1"
                      defaultValue={editingProduct.price}
                      required
                      className="bg-[#1a1d24] border-[#2a2f3a] text-[#f0f2f5] h-11 pl-7 focus:border-[#FEC501]/50 focus:ring-2 focus:ring-[#FEC501]/20 transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[#c4cdd9] font-medium">Categoria</Label>
                  <Select
                    name="category_id"
                    defaultValue={editingProduct.category_id}
                    required
                  >
                    <SelectTrigger className="bg-[#1a1d24] border-[#2a2f3a] text-[#f0f2f5] h-11 focus:ring-2 focus:ring-[#FEC501]/20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1d24] border-[#2a2f3a]">
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id} className="focus:bg-[#2a2f3a] focus:text-[#f0f2f5]">
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[#c4cdd9] font-medium">URL de imagen (opcional)</Label>
                  <Input
                    name="image_url"
                    type="url"
                    defaultValue={editingProduct.image_url || ''}
                    placeholder="URL de la imagen"
                    className="bg-[#1a1d24] border-[#2a2f3a] text-[#f0f2f5] h-11 placeholder:text-[#8b9ab0] placeholder:italic focus:border-[#FEC501]/50 focus:ring-2 focus:ring-[#FEC501]/20 transition-all"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full h-11 bg-[#FEC501] hover:bg-[#E5B001] text-black font-semibold shadow-lg shadow-[#FEC501]/20 transition-all duration-200"
                >
                  Guardar Cambios
                </Button>
              </form>
            )}
          </DialogContent>
        </Dialog>
    </AdminLayout>
  )
}
