Extension { #name : #Form }

{ #category : #'*SqueakXR-Core' }
Form >> drawOnTexture: aTexture [

	<primitive: 117> #(Form2CanvasPlugin primitiveDrawFormOnTexture 0 0) at: 1.
	self primitiveFailed
]

{ #category : #'*SqueakXR-Core' }
Form class >> setWebCanvasVisibility: aBoolean [

	"Set the visibliity of the canvas element on the webpage. Might be useful for debugging."
	<primitive: 117> #(Form2CanvasPlugin primitiveSetFormVisibility 0 0) at: 1.
	self primitiveFailed
]
