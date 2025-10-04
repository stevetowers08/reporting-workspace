# 5 Tab Design Options

## Option 1: Minimal Underline Style

```tsx
<TabsList className="w-full justify-start bg-transparent border-b border-gray-200 h-10">
  <TabsTrigger className="text-sm font-medium px-4 py-2 border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600">
    Summary
  </TabsTrigger>
  <TabsTrigger className="text-sm font-medium px-4 py-2 border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600">
    Meta Ads
  </TabsTrigger>
  <TabsTrigger className="text-sm font-medium px-4 py-2 border-b-2 border-transparent data-[state=active]:border-red-600 data-[state=active]:text-red-600">
    Google Ads
  </TabsTrigger>
  <TabsTrigger className="text-sm font-medium px-4 py-2 border-b-2 border-transparent data-[state=active]:border-purple-600 data-[state=active]:text-purple-600">
    Analytics
  </TabsTrigger>
</TabsList>
```

## Option 2: Pill Style with Icons

```tsx
<TabsList className="w-full justify-start bg-gray-100 rounded-lg p-1 h-9">
  <TabsTrigger className="text-sm font-medium px-3 py-1 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">
    Summary
  </TabsTrigger>
  <TabsTrigger className="text-sm font-medium px-3 py-1 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">
    <div className="flex items-center gap-1.5">
      <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
      Meta Ads
    </div>
  </TabsTrigger>
  <TabsTrigger className="text-sm font-medium px-3 py-1 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">
    <div className="flex items-center gap-1.5">
      <div className="w-3 h-3 bg-red-600 rounded-full"></div>
      Google Ads
    </div>
  </TabsTrigger>
  <TabsTrigger className="text-sm font-medium px-3 py-1 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">
    Analytics
  </TabsTrigger>
</TabsList>
```

## Option 3: Segmented Control Style

```tsx
<TabsList className="w-full justify-start bg-gray-200 rounded-lg p-0.5 h-8">
  <TabsTrigger className="text-sm font-medium px-3 py-1 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm flex-1">
    Summary
  </TabsTrigger>
  <TabsTrigger className="text-sm font-medium px-3 py-1 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm flex-1">
    Meta Ads
  </TabsTrigger>
  <TabsTrigger className="text-sm font-medium px-3 py-1 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm flex-1">
    Google Ads
  </TabsTrigger>
  <TabsTrigger className="text-sm font-medium px-3 py-1 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm flex-1">
    Analytics
  </TabsTrigger>
</TabsList>
```

## Option 4: Card Style with Background

```tsx
<TabsList className="w-full justify-start bg-white border border-gray-200 rounded-lg p-1 h-10">
  <TabsTrigger className="text-sm font-medium px-4 py-2 rounded-md data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:border data-[state=active]:border-blue-200">
    Summary
  </TabsTrigger>
  <TabsTrigger className="text-sm font-medium px-4 py-2 rounded-md data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:border data-[state=active]:border-blue-200">
    Meta Ads
  </TabsTrigger>
  <TabsTrigger className="text-sm font-medium px-4 py-2 rounded-md data-[state=active]:bg-red-50 data-[state=active]:text-red-700 data-[state=active]:border data-[state=active]:border-red-200">
    Google Ads
  </TabsTrigger>
  <TabsTrigger className="text-sm font-medium px-4 py-2 rounded-md data-[state=active]:bg-purple-50 data-[state=active]:text-purple-700 data-[state=active]:border data-[state=active]:border-purple-200">
    Analytics
  </TabsTrigger>
</TabsList>
```

## Option 5: Minimal Border Style

```tsx
<TabsList className="w-full justify-start bg-transparent h-8">
  <TabsTrigger className="text-sm font-medium px-4 py-1 border border-transparent rounded-t-md data-[state=active]:border-gray-300 data-[state=active]:border-b-white data-[state=active]:bg-white data-[state=active]:shadow-sm">
    Summary
  </TabsTrigger>
  <TabsTrigger className="text-sm font-medium px-4 py-1 border border-transparent rounded-t-md data-[state=active]:border-gray-300 data-[state=active]:border-b-white data-[state=active]:bg-white data-[state=active]:shadow-sm">
    Meta Ads
  </TabsTrigger>
  <TabsTrigger className="text-sm font-medium px-4 py-1 border border-transparent rounded-t-md data-[state=active]:border-gray-300 data-[state=active]:border-b-white data-[state=active]:bg-white data-[state=active]:shadow-sm">
    Google Ads
  </TabsTrigger>
  <TabsTrigger className="text-sm font-medium px-4 py-1 border border-transparent rounded-t-md data-[state=active]:border-gray-300 data-[state=active]:border-b-white data-[state=active]:bg-white data-[state=active]:shadow-sm">
    Analytics
  </TabsTrigger>
</TabsList>
```
