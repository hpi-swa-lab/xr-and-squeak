Class {
	#name : #XRBrokenRotatingCube,
	#superclass : #XRObject,
	#category : #'SqueakXR-Misc'
}

{ #category : #'as yet unclassified' }
XRBrokenRotatingCube >> initializeThreeObject [

	^ Three Mesh
		new: (Three BoxGeometry
			new: 1m
			height: 1m
			depth: 1m)
		material: (Three MeshLambertMaterial
			new: ({#color -> 16rff00ff} as: Dictionary)).
]

{ #category : #'as yet unclassified' }
XRBrokenRotatingCube >> step: delta [

	self threeObject rotation y: delta / 1000 + self threeObject rotation y.
	
	ThreadSafeRandom next > 0.99 ifTrue: [self error: 'oops']
]
