Extension { #name : #Object }

{ #category : #'*SqueakXR-helpers' }
Object >> asVector [

	self error: 'Cannot convert ', self class name, ' to vector'
]
