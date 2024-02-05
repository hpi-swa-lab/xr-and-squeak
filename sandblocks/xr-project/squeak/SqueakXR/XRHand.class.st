Class {
	#name : #XRHand,
	#superclass : #Object,
	#instVars : [
		'index',
		'threeObject',
		'world'
	],
	#category : #SqueakXR
}

{ #category : #'as yet unclassified' }
XRHand >> createModel [

	| sphere |
	sphere := Three Mesh
		new: (Three SphereGeometry
			new: 5cm
			widthSegments: 32
			heightSegments: 16)
		material: (Three MeshLambertMaterial
			new: ({#color -> 16rffffff} as: Dictionary)).
	
	self threeObject add: sphere.
	
	sphere := Three Mesh
		new: (Three SphereGeometry
			new: 1cm
			widthSegments: 32
			heightSegments: 16)
		material: (Three MeshLambertMaterial
			new: ({#color -> 16rffffff} as: Dictionary)).
	sphere position z: -15cm.
	
	self threeObject add: sphere.
]

{ #category : #accessing }
XRHand >> index [

	^ index
]

{ #category : #accessing }
XRHand >> index: anIndex [

	index := anIndex
]

{ #category : #accessing }
XRHand >> threeObject [
	
	^ threeObject ifNil: [
		threeObject := self world renderer xr getController: self index.
		self createModel.
		threeObject]
]

{ #category : #accessing }
XRHand >> world [

	^ world
]

{ #category : #accessing }
XRHand >> world: aWorld [

	world := aWorld
]
