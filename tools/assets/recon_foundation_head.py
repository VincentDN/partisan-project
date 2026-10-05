"""Remove the fused outer hood, preserve the textured face, and close the masked head underneath."""
import bpy, bmesh, math
import recon_foundation_geometry as geo


def unhood(source, fabric):
    # The source has no complete scalp under its hood. Retain only the central face patch,
    # including the original eye surfaces and UVs; replace the hood with a fitted crown.
    source.name='SK_CM_Face'
    bm=bmesh.new();bm.from_mesh(source.data)
    bmesh.ops.delete(bm,geom=[f for f in bm.faces if f.material_index!=1],context='FACES')
    for origin,normal in [((-.069,0,0),(-1,0,0)),((.069,0,0),(1,0,0)),
                          ((0,0,1.599),(0,0,-1)),((0,0,1.772),(0,0,1)),
                          ((0,-.064,0),(0,1,0))]:
        bmesh.ops.bisect_plane(bm,geom=list(bm.verts)+list(bm.edges)+list(bm.faces),dist=.000001,
                              plane_co=origin,plane_no=normal,clear_outer=True)
    bmesh.ops.delete(bm,geom=[v for v in bm.verts if not v.link_faces],context='VERTS')
    bmesh.ops.triangulate(bm,faces=list(bm.faces));bm.to_mesh(source.data);bm.free()
    face=source.data.materials[1];source.data.materials.clear();source.data.materials.append(face)
    source.data.materials.append(fabric)
    for polygon in source.data.polygons:
        center=polygon.center
        # Repaint only fabric around the preserved skin/eyes, removing the old hood's edge colour.
        polygon.material_index=1 if center.z<1.695 or center.z>1.766 or abs(center.x)>.063 else 0
    # Skull/jaw cross-sections: no hanging hem, pointed crown or hood shoulder volume.
    profile=[(1.577,.051,.047),(1.605,.068,.065),(1.635,.079,.085),
             (1.675,.087,.100),(1.725,.087,.106),(1.770,.082,.102),
             (1.800,.067,.087),(1.820,.040,.060),(1.827,.007,.012)]
    verts=[];faces=[];n=24
    for z,width,depth in profile:
        for i in range(n):
            a=i*math.tau/n
            verts.append((width*math.sin(a),.020-depth*math.cos(a),z))
    for k in range(len(profile)-1):
        for i in range(n):
            a=k*n+i;b=k*n+(i+1)%n;faces.append((a,b,b+n,a+n))
    faces.extend([tuple(reversed(range(n))),tuple(range((len(profile)-1)*n,len(profile)*n))])
    skull=geo.mesh('SK_CM_Head',verts,faces,fabric)
    for polygon in skull.data.polygons:polygon.use_smooth=True
    return [source,skull]
