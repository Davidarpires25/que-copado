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

  return (
    <div className="min-h-screen bg-slate-950">
      <header className="border-b border-slate-800 bg-slate-950/95 backdrop-blur">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🍔</span>
            <span className="text-xl font-bold text-white">
              Que <span className="text-[#FFAE00]">Copado</span>
            </span>
            <Badge className="bg-slate-800 text-slate-300 ml-2">Admin</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/admin/delivery-zones">
              <Button
                variant="ghost"
                className="text-slate-400 hover:text-white"
              >
                <MapPin className="h-4 w-4 mr-2" />
                Zonas de Envío
              </Button>
            </Link>
            <form action={signOut}>
              <Button
                type="submit"
                variant="ghost"
                className="text-slate-400 hover:text-white"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Salir
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">
              Gestión de Productos
            </h1>
            <p className="text-slate-400">
              {products.length} productos en total
            </p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#FFAE00] hover:bg-[#E09D00] text-black font-semibold">
                <Plus className="h-4 w-4 mr-2" />
                Agregar Producto
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-950 border-slate-800 max-w-md">
              <DialogHeader>
                <DialogTitle className="text-white">
                  Nuevo Producto
                </DialogTitle>
              </DialogHeader>
              <form action={handleAddProduct} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">Nombre</Label>
                  <Input
                    name="name"
                    required
                    className="bg-slate-900 border-slate-700 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Descripcion</Label>
                  <Textarea
                    name="description"
                    className="bg-slate-900 border-slate-700 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Precio</Label>
                  <Input
                    name="price"
                    type="number"
                    step="1"
                    required
                    className="bg-slate-900 border-slate-700 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Categoria</Label>
                  <Select name="category_id" required>
                    <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                      <SelectValue placeholder="Seleccionar..." />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700">
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">URL de imagen</Label>
                  <Input
                    name="image_url"
                    type="url"
                    placeholder="https://..."
                    className="bg-slate-900 border-slate-700 text-white"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-[#FFAE00] hover:bg-[#E09D00] text-black font-semibold"
                >
                  Crear Producto
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg border border-slate-800 overflow-hidden"
        >
          <Table>
            <TableHeader>
              <TableRow className="border-slate-800 hover:bg-slate-900/50">
                <TableHead className="text-slate-400">Producto</TableHead>
                <TableHead className="text-slate-400">Categoria</TableHead>
                <TableHead className="text-slate-400">Precio</TableHead>
                <TableHead className="text-slate-400 text-center">
                  Stock
                </TableHead>
                <TableHead className="text-slate-400 text-center">
                  Activo
                </TableHead>
                <TableHead className="text-slate-400 text-right">
                  Acciones
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow
                  key={product.id}
                  className="border-slate-800 hover:bg-slate-900/50"
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded bg-slate-800 flex items-center justify-center">
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt={product.name}
                            className="h-10 w-10 rounded object-cover"
                          />
                        ) : (
                          <Package className="h-5 w-5 text-slate-500" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-white">{product.name}</p>
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
                      className="border-slate-700 text-slate-300"
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
                          className="w-24 h-8 bg-slate-900 border-slate-700 text-white"
                          type="number"
                          autoFocus
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-green-500 hover:text-green-400"
                          onClick={() => handlePriceSave(product.id)}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-red-500 hover:text-red-400"
                          onClick={() => setEditingPrice(null)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handlePriceEdit(product)}
                        className="flex items-center gap-1 text-[#FFAE00] hover:text-[#E09D00] transition-colors font-medium"
                      >
                        {formatPrice(product.price)}
                        <DollarSign className="h-3 w-3 opacity-50" />
                      </button>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={!product.is_out_of_stock}
                      onCheckedChange={() => handleToggleStock(product)}
                      className="data-[state=checked]:bg-green-600"
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={product.is_active}
                      onCheckedChange={() => handleToggleActive(product)}
                      className="data-[state=checked]:bg-[#FFAE00]"
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-slate-400 hover:text-white"
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
                        className="h-8 w-8 text-red-500 hover:text-red-400"
                        onClick={() => handleDelete(product.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </motion.div>

        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="bg-slate-950 border-slate-800 max-w-md">
            <DialogHeader>
              <DialogTitle className="text-white">Editar Producto</DialogTitle>
            </DialogHeader>
            {editingProduct && (
              <form action={handleEditProduct} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">Nombre</Label>
                  <Input
                    name="name"
                    defaultValue={editingProduct.name}
                    required
                    className="bg-slate-900 border-slate-700 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Descripcion</Label>
                  <Textarea
                    name="description"
                    defaultValue={editingProduct.description || ''}
                    className="bg-slate-900 border-slate-700 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Precio</Label>
                  <Input
                    name="price"
                    type="number"
                    step="1"
                    defaultValue={editingProduct.price}
                    required
                    className="bg-slate-900 border-slate-700 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Categoria</Label>
                  <Select
                    name="category_id"
                    defaultValue={editingProduct.category_id}
                    required
                  >
                    <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700">
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">URL de imagen</Label>
                  <Input
                    name="image_url"
                    type="url"
                    defaultValue={editingProduct.image_url || ''}
                    placeholder="https://..."
                    className="bg-slate-900 border-slate-700 text-white"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-[#FFAE00] hover:bg-[#E09D00] text-black font-semibold"
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
